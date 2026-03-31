const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const REGION = process.env.AWS_REGION || 'us-east-1';

const textract = new TextractClient({ region: REGION });

// ─── Known MCA/lender keywords to detect positions ───────────────────────────
const LENDER_KEYWORDS = [
  'idea', 'channel', 'can', 'wall', 'fund so fast', 'fundsofast',
  'lg', 'legend', 'pinnacle', 'specialty', 'britecap', 'fox',
  'rtmi', 'family funding', 'afb', 'dexly', 'credibly', 'ondeck', 'on deck',
  'libertas', 'kapitus', 'pirs', 'afg', 'mulligan', 'byzfunder', 'fintap',
  'fundworks', 'forward', 'headway', 'cedar', 'hunter caroline',
  'newco', 'smarter merchant', 'spartan', 'luminar', 'everest', 'bitty',
  'arsenal', 'pearl', 'cfg', 'gfe', 'mayfair', 'iruka', 'cobalt', 'lily',
  'jw capital', 'amerifi', 'lendini', 'nexi', 'fundfi', 'throttle', 'velocity',
  'smart step', 'garden', 'vader', 'rapid', 'greenbox',
  'backd', 'journey', '2m7', 'merchant growth', 'canacap', 'icapital',
  'sheaves', 'ontap', 'km capital', 'lexio', 'expansion', 'payroc',
  'drip capital', 'jrw capital', 'east harbor', 'merit equipment', 'slim capital',
  'smartbiz', 'loanbud', 'indvance', 'inadvance',
  'mca servicing', 'global merchant', 'fundry', 'enova', 'mrbizcap', 'sbfs',
  'ufce', 'united first', 'global funding', 'dbf servicing', 'strategic funding',
  'funding metrics', '3201961', 'ontario inc', '11302078', 'canada ltd',
  'retail capital', 'fund cap', 'merchant opportunities', 'advance service',
  'ecg', 'j&g', 'icg', 'jr capital', 'lending services', 'ural link',
  'ascentra', 'delta', 'delta bridge', 'house', 'fundamental',
  'channel partners',
];

// Sort longest-first so "channel partners" matches before "channel"
const SORTED_KEYWORDS = [...LENDER_KEYWORDS].sort((a, b) => b.length - a.length);

// Match lender keywords in a line of text — returns array of matched keywords
// e.g. "GREENBOX CAPITA" matches "greenbox", "SHEAVES CAPITAL" matches "sheaves"
function matchLender(lineText) {
  const lower = lineText.toLowerCase();
  const matches = [];
  const used = new Set();
  for (const keyword of SORTED_KEYWORDS) {
    if (lower.includes(keyword) && !used.has(keyword)) {
      matches.push(keyword);
      used.add(keyword);
      // If a longer keyword contains a shorter one, skip the shorter
      // e.g. "channel partners" found → skip "channel"
      for (const other of SORTED_KEYWORDS) {
        if (other !== keyword && keyword.includes(other)) used.add(other);
      }
    }
  }
  return matches;
}

// ─── Start async Textract job ─────────────────────────────────────────────────
async function startTextractJob(s3Key) {
  const cmd = new StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: BUCKET, Name: s3Key } },
  });
  const res = await textract.send(cmd);
  return res.JobId;
}

// ─── Poll until job completes (max 90s) ───────────────────────────────────────
async function waitForJob(jobId) {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await textract.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
    if (res.JobStatus === 'SUCCEEDED') return res;
    if (res.JobStatus === 'FAILED') throw new Error('Textract job failed');
  }
  throw new Error('Textract job timed out');
}

// ─── Collect all pages of results ────────────────────────────────────────────
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

// ─── Parse a dollar string to float ──────────────────────────────────────────
function parseDollar(str) {
  const cleaned = str.replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

// ─── Main parser ──────────────────────────────────────────────────────────────
function parseFinancials(blocks) {
  const lines = blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => (b.Text || '').trim())
    .filter(Boolean);

  const fullText = lines.join('\n').toLowerCase();

  const creditLines = [];
  const debitLines = [];

  const dollarRe = /\$?([\d,]+\.\d{2})/g;

  lines.forEach(line => {
    const lower = line.toLowerCase();
    const amounts = [];
    let m;
    while ((m = dollarRe.exec(line)) !== null) {
      const val = parseDollar(m[1]);
      if (val !== null && val >= 1 && val <= 9999999) amounts.push(val);
    }
    if (!amounts.length) return;

    const isCredit =
      /\b(cr|credit|deposit|dep|incoming|received|transfer in|direct dep|payroll|ach credit|wire in)\b/.test(lower) ||
      /\+\s*\$/.test(line);

    const isDebit =
      /\b(dr|debit|withdrawal|withdraw|payment|purchase|pos |ach debit|wire out|check|fee|charge)\b/.test(lower) ||
      /-\s*\$/.test(line);

    if (isCredit && !isDebit) {
      amounts.forEach(v => creditLines.push({ amount: v, line }));
    } else if (isDebit && !isCredit) {
      amounts.forEach(v => debitLines.push({ amount: v, line }));
    }
  });

  // ── Determine months covered ──────────────────────────────────────────────
  const monthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
  const foundMonths = new Set();
  let mm;
  while ((mm = monthRe.exec(fullText)) !== null) {
    foundMonths.add(mm[1].toLowerCase().slice(0, 3));
  }
  const monthsCovered = Math.max(foundMonths.size, 1);

  // ── Avg monthly revenue ───────────────────────────────────────────────────
  const totalCredits = creditLines.reduce((sum, c) => sum + c.amount, 0);
  const numberOfDeposits = creditLines.length;

  const avgMonthlyRevenue = numberOfDeposits > 0 && totalCredits > 0
    ? Math.round(totalCredits / monthsCovered)
    : null;

  const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

  // ── Negative days ─────────────────────────────────────────────────────────
  const negRe = /(-\$[\d,]+\.?\d{0,2}|\bOD\b|overdraft|nsf|insufficient funds|negative balance)/gi;
  const negMatches = fullText.match(negRe) || [];
  const negativeDays = negMatches.length;

  // ── Lender position detection (keyword-based, fuzzy) ──────────────────────
  const detectedLenders = {};

  lines.forEach(line => {
    const matched = matchLender(line);
    matched.forEach(keyword => {
      const amounts = [];
      let m2;
      const re = /\$?([\d,]+\.\d{2})/g;
      while ((m2 = re.exec(line)) !== null) {
        const val = parseDollar(m2[1]);
        if (val !== null && val >= 100 && val <= 500000) amounts.push(val);
      }

      const normalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      if (!detectedLenders[normalized]) {
        detectedLenders[normalized] = { name: normalized, totalPaid: 0, occurrences: 0 };
      }
      detectedLenders[normalized].occurrences += 1;
      if (amounts.length) {
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
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
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
