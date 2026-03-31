const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const REGION = process.env.AWS_REGION || 'us-east-1';

const textract = new TextractClient({ region: REGION });

// ─── Known MCA/lender keywords to detect positions ───────────────────────────
const LENDER_KEYWORDS = [
  'idea', 'channel can', 'channelcan', 'wall street', 'fund so fast', 'fundsofast',
  'lg funding', 'legend funding', 'pinnacle', 'specialty', 'britecap', 'fox capital',
  'rtmi', 'family funding', 'afb', 'dexly', 'credibly', 'ondeck', 'on deck',
  'libertas', 'kapitus', 'pirs', 'afg', 'mulligan', 'byzfunder', 'fintap',
  'fundworks', 'forward financing', 'headway', 'cedar advance', 'hunter caroline',
  'newco', 'smarter merchant', 'spartan', 'luminar', 'everest', 'bitty advance',
  'arsenal', 'pearl', 'cfg', 'gfe', 'mayfair', 'iruka', 'cobalt', 'lily',
  'jw capital', 'amerifi', 'lendini', 'nexi', 'fundfi', 'throttle', 'velocity',
  'smart step', 'garden', 'vader', 'rapid finance', 'greenbox', 'advance',
  'backd', 'journey', '2m7', 'merchant growth', 'canacap', 'icapital',
  'sheaves', 'ontap', 'km capital', 'lexio', 'expansion capital', 'payroc',
  'drip capital', 'jrw capital', 'east harbor', 'merit equipment', 'slim capital',
  'smartbiz', 'loanbud', 'indvance', 'wall funding',
];

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

  // ── Step 1: Extract all credit (deposit) transactions ─────────────────────
  // Strategy: scan every line for a dollar amount preceded or followed by
  // credit indicators. We sum ALL credits to get total deposits, then divide
  // by months covered to get avg monthly revenue.

  const creditLines = [];
  const debitLines = [];

  // Regex: dollar amount with optional sign/CR/DR suffix or prefix
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

    // If line has CR marker or no debit marker, treat as credit
    if (isCredit && !isDebit) {
      amounts.forEach(v => creditLines.push({ amount: v, line }));
    } else if (isDebit && !isCredit) {
      amounts.forEach(v => debitLines.push({ amount: v, line }));
    } else if (!isCredit && !isDebit) {
      // Ambiguous — skip to avoid double counting
    }
  });

  // ── Step 2: Determine months covered ──────────────────────────────────────
  // Look for month names in the document
  const monthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
  const foundMonths = new Set();
  let mm;
  while ((mm = monthRe.exec(fullText)) !== null) {
    foundMonths.add(mm[1].toLowerCase().slice(0, 3));
  }
  const monthsCovered = Math.max(foundMonths.size, 1);

  // ── Step 3: Avg monthly revenue = total credits / months ──────────────────
  const totalCredits = creditLines.reduce((sum, c) => sum + c.amount, 0);
  const numberOfDeposits = creditLines.length;

  // Only trust if we found meaningful credits
  const avgMonthlyRevenue = numberOfDeposits > 0 && totalCredits > 0
    ? Math.round(totalCredits / monthsCovered)
    : null;

  const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

  // ── Step 4: Negative days ──────────────────────────────────────────────────
  const negRe = /(-\$[\d,]+\.?\d{0,2}|\bOD\b|overdraft|nsf|insufficient funds|negative balance)/gi;
  const negMatches = fullText.match(negRe) || [];
  const negativeDays = negMatches.length;

  // ── Step 5: Lender position detection ─────────────────────────────────────
  const detectedLenders = {};

  lines.forEach(line => {
    const lower = line.toLowerCase();

    LENDER_KEYWORDS.forEach(keyword => {
      if (lower.includes(keyword)) {
        // Extract dollar amount from this line
        const amounts = [];
        let m2;
        while ((m2 = dollarRe.exec(line)) !== null) {
          const val = parseDollar(m2[1]);
          if (val !== null && val >= 100 && val <= 500000) amounts.push(val);
        }

        // Normalize lender name
        const normalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        if (!detectedLenders[normalized]) {
          detectedLenders[normalized] = { name: normalized, totalPaid: 0, occurrences: 0 };
        }
        detectedLenders[normalized].occurrences += 1;
        if (amounts.length) {
          detectedLenders[normalized].totalPaid += amounts.reduce((a, b) => a + b, 0);
        }
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
