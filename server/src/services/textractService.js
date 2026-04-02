const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const REGION = process.env.AWS_REGION || 'us-east-1';

const textract = new TextractClient({ region: REGION });

// ─── Lender keywords split into safe (unique) and ambiguous (need $ on same line) ─
const SAFE_KEYWORDS = [
  'fund so fast', 'fundsofast', 'britecap', 'credibly', 'ondeck', 'on deck',
  'libertas', 'kapitus', 'byzfunder', 'fintap', 'fundworks', 'greenbox',
  'canacap', 'icapital', 'km capital', 'expansion capital', 'payroc',
  'drip capital', 'jrw capital', 'east harbor', 'merit equipment', 'slim capital',
  'smartbiz', 'loanbud', 'indvance', 'hunter caroline', 'smarter merchant',
  'merchant growth', 'family funding', 'channel partners', 'smart step',
  'jw capital', 'mca servicing', 'global merchant', 'strategic funding',
  'funding metrics', 'retail capital', 'merchant opportunities',
  'delta bridge', 'lending services', 'fund cap', 'advance service',
  'dbf servicing', 'united first', 'global funding',
  'amerifi', 'lendini', 'fundfi', 'throttle', 'velocity', 'dexly',
  'mulligan', 'spartan', 'luminar', 'everest', 'mayfair', 'iruka',
  'cobalt', 'sheaves', 'ontap', 'lexio', 'backd', 'pinnacle',
  'specialty', 'rtmi', 'afb', 'afg', 'pirs', 'cfg', 'gfe', 'nexi',
  '2m7', 'legend', 'headway', 'newco', 'vader', 'rapid finance',
  'arsenal', 'bitty', 'fundry', 'enova', 'mrbizcap',
];

// These common words only count as lender matches if a dollar amount is on the same line
const AMBIGUOUS_KEYWORDS = [
  'idea', 'channel', 'can', 'wall', 'lg', 'fox', 'pearl', 'lily',
  'garden', 'journey', 'cedar', 'forward', 'house', 'delta', 'rapid',
  'fundamental', 'ascentra',
];

const ALL_KEYWORDS = [...SAFE_KEYWORDS, ...AMBIGUOUS_KEYWORDS].sort((a, b) => b.length - a.length);

function matchLender(lineText, hasDollar) {
  const lower = lineText.toLowerCase();
  const matches = [];
  const used = new Set();
  for (const keyword of ALL_KEYWORDS) {
    if (used.has(keyword)) continue;
    if (!lower.includes(keyword)) continue;

    // Ambiguous keywords require a dollar amount on the same line
    if (AMBIGUOUS_KEYWORDS.includes(keyword) && !hasDollar) continue;

    matches.push(keyword);
    used.add(keyword);
    for (const other of ALL_KEYWORDS) {
      if (other !== keyword && keyword.includes(other)) used.add(other);
    }
  }
  return matches;
}

// ─── Textract job management ──────────────────────────────────────────────────
async function startTextractJob(s3Key) {
  const res = await textract.send(new StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: BUCKET, Name: s3Key } },
  }));
  return res.JobId;
}

async function waitForJob(jobId) {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await textract.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
    if (res.JobStatus === 'SUCCEEDED') return res;
    if (res.JobStatus === 'FAILED') throw new Error('Textract job failed');
  }
  throw new Error('Textract job timed out');
}

async function getAllBlocks(jobId) {
  let blocks = [];
  let nextToken;
  do {
    const params = { JobId: jobId };
    if (nextToken) params.NextToken = nextToken;
    const res = await textract.send(new GetDocumentTextDetectionCommand(params));
    blocks = blocks.concat(res.Blocks || []);
    nextToken = res.NextToken;
  } while (nextToken);
  return blocks;
}

function parseDollar(str) {
  const cleaned = str.replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

// Helper: extract all dollar amounts from a line (fresh regex each time — fix #1)
function extractAmounts(line, min = 1, max = 9999999) {
  const re = /\$?([\d,]+\.\d{2})/g;
  const amounts = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    const val = parseDollar(m[1]);
    if (val !== null && val >= min && val <= max) amounts.push(val);
  }
  return amounts;
}

// ─── Main parser ──────────────────────────────────────────────────────────────
function parseFinancials(blocks) {
  const lines = blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => (b.Text || '').trim())
    .filter(Boolean);

  const fullText = lines.join('\n').toLowerCase();

  // ── Step 1: Look for summary credit lines FIRST (most accurate) ───────────
  const summaryCredits = [];
  lines.forEach(line => {
    const lower = line.toLowerCase();
    const isSummaryLine = /\b(total credits|total deposits|credits this period|credits in this period|total credit|deposits total|total dep)\b/.test(lower);
    if (isSummaryLine) {
      const amounts = extractAmounts(line, 100, 99999999);
      if (amounts.length > 0) {
        const best = Math.max(...amounts);
        summaryCredits.push(best);
        console.log(`[Textract] Summary line: "${line.trim()}" → $${best.toLocaleString()}`);
      }
    }
  });

  // ── Step 2: If no summary lines, sum individual credits ───────────────────
  const creditLines = [];

  if (summaryCredits.length === 0) {
    lines.forEach(line => {
      const lower = line.toLowerCase();
      const amounts = extractAmounts(line);
      if (!amounts.length) return;

      const isCredit =
        /\b(cr|credit|deposit|dep|incoming|received|transfer in|direct dep|payroll|ach credit|wire in)\b/.test(lower) ||
        /\+\s*\$/.test(line);

      const isDebit =
        /\b(dr|debit|withdrawal|withdraw|payment|purchase|pos |ach debit|wire out|check|fee|charge)\b/.test(lower) ||
        /-\s*\$/.test(line);

      if (isCredit && !isDebit) {
        amounts.forEach(v => creditLines.push({ amount: v, line }));
      }
    });
  }

  // ── Months covered — use summary line count if available (fix #2) ─────────
  // If we found summary lines, each one = 1 month. More reliable than counting month names.
  let monthsCovered;
  if (summaryCredits.length > 0) {
    monthsCovered = summaryCredits.length;
  } else {
    const monthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
    const foundMonths = new Set();
    let mm;
    while ((mm = monthRe.exec(fullText)) !== null) {
      foundMonths.add(mm[1].toLowerCase().slice(0, 3));
    }
    monthsCovered = Math.max(foundMonths.size, 1);
  }

  // ── Calculate revenue ─────────────────────────────────────────────────────
  let totalCredits;
  let numberOfDeposits;

  if (summaryCredits.length > 0) {
    totalCredits = summaryCredits.reduce((sum, v) => sum + v, 0);
    numberOfDeposits = summaryCredits.length;
    console.log(`[Textract] Using ${summaryCredits.length} summary line(s), total: $${totalCredits.toLocaleString()}`);
  } else {
    totalCredits = creditLines.reduce((sum, c) => sum + c.amount, 0);
    numberOfDeposits = creditLines.length;
    console.log(`[Textract] Summed ${numberOfDeposits} individual credits: $${totalCredits.toLocaleString()}`);
  }

  const avgMonthlyRevenue = totalCredits > 0
    ? Math.round(totalCredits / monthsCovered)
    : null;

  const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

  // ── Negative days ─────────────────────────────────────────────────────────
  const negRe = /(-\$[\d,]+\.?\d{0,2}|\bOD\b|overdraft|nsf|insufficient funds|negative balance)/gi;
  const negMatches = fullText.match(negRe) || [];
  const negativeDays = negMatches.length;

  // ── Lender position detection (fix #4 — ambiguous words need $ context) ───
  const detectedLenders = {};

  lines.forEach(line => {
    const amounts = extractAmounts(line, 100, 500000);
    const hasDollar = amounts.length > 0;
    const matched = matchLender(line, hasDollar);

    matched.forEach(keyword => {
      const normalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      if (!detectedLenders[normalized]) {
        detectedLenders[normalized] = { name: normalized, totalPaid: 0, occurrences: 0 };
      }
      detectedLenders[normalized].occurrences += 1;
      if (hasDollar) {
        detectedLenders[normalized].totalPaid += amounts.reduce((a, b) => a + b, 0);
      }
    });
  });

  const positions = Object.values(detectedLenders).filter(l => l.occurrences > 0);
  const totalLenderPayments = positions.reduce((sum, l) => sum + l.totalPaid, 0);
  const withholdingRate = avgMonthlyRevenue && totalLenderPayments > 0
    ? parseFloat((totalLenderPayments / avgMonthlyRevenue * 100).toFixed(1))
    : 0;

  return {
    avgMonthlyRevenue,
    estimatedAnnualRevenue,
    numberOfDeposits,
    totalCredits: Math.round(totalCredits),
    negativeDays,
    monthsCovered,
    positions,
    positionCount: positions.length,
    totalLenderPayments: Math.round(totalLenderPayments),
    withholdingRate,
    extractedAt: new Date().toISOString(),
    confidence: avgMonthlyRevenue ? 'high' : 'low',
    lines, // include raw lines for debugging
  };
}

async function extractBankStatement(s3Key) {
  try {
    const jobId = await startTextractJob(s3Key);
    await waitForJob(jobId);
    const blocks = await getAllBlocks(jobId);
    const financials = parseFinancials(blocks);
    return { success: true, jobId, ...financials };
  } catch (err) {
    console.error('[Textract] Extraction error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { extractBankStatement };
