const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const REGION = process.env.AWS_REGION || 'us-east-1';
const textract = new TextractClient({ region: REGION });

// ─── BANK SUMMARY PATTERNS ───────────────────────────────────────────────────
// Each pattern: regex to match the line, then extract the dollar amount from it.
// Ordered by specificity — most specific first.
const SUMMARY_PATTERNS = [
  // Exact summary line matches (highest confidence)
  /total\s+deposits?\s+and\s+(?:other\s+)?(?:additions?|credits?)\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+deposits?\s+and\s+additions?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+credits?\s+this\s+period\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /credits?\s+(?:this|in\s+this)\s+period\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+credits?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+deposits?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /deposits?\s+total\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+additions?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+incoming\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+money\s+in\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /deposits?\s+&\s+(?:other\s+)?credits?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /credits?\s+&\s+deposits?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+(?:electronic\s+)?deposits?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  // Canadian banks
  /total\s+credits?\s+\(CAD\)\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+des\s+cr[eé]dits?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
];

// Lines to SKIP — these look like summary lines but aren't credits
const SKIP_PATTERNS = [
  /total\s+(?:debits?|withdrawals?|checks?|fees?|charges?|payments?)/i,
  /total\s+(?:money\s+out|outgoing)/i,
  /ending\s+balance/i,
  /beginning\s+balance/i,
  /opening\s+balance/i,
  /closing\s+balance/i,
  /available\s+balance/i,
  /current\s+balance/i,
  /minimum\s+balance/i,
  /average\s+(?:daily\s+)?balance/i,
  /overdraft/i,
  /interest\s+(?:earned|paid|charged)/i,
  /service\s+(?:charge|fee)/i,
  /account\s+(?:number|summary)/i,
  /statement\s+period/i,
  /page\s+\d/i,
];

// ─── LENDER KEYWORDS ──────────────────────────────────────────────────────────
const SAFE_LENDERS = [
  'fund so fast', 'britecap', 'credibly', 'ondeck', 'on deck',
  'libertas', 'kapitus', 'byzfunder', 'fintap', 'fundworks', 'greenbox',
  'canacap', 'icapital', 'km capital', 'expansion capital', 'payroc',
  'drip capital', 'jrw capital', 'east harbor', 'merit equipment', 'slim capital',
  'smartbiz', 'loanbud', 'indvance', 'hunter caroline', 'smarter merchant',
  'merchant growth', 'family funding', 'channel partners', 'smart step',
  'jw capital', 'amerifi', 'lendini', 'fundfi', 'throttle', 'velocity', 'dexly',
  'mulligan', 'spartan', 'luminar', 'everest', 'mayfair', 'iruka',
  'cobalt', 'sheaves', 'ontap', 'lexio', 'backd', 'pinnacle',
  'specialty', 'rtmi', 'afb', 'afg', 'pirs', 'cfg', 'gfe', 'nexi',
  '2m7', 'legend', 'headway', 'newco', 'vader', 'rapid finance',
  'arsenal', 'bitty', 'mca servicing', 'strategic funding',
];

const AMBIGUOUS_LENDERS = [
  'idea', 'channel', 'can', 'wall', 'lg', 'fox', 'pearl', 'lily',
  'garden', 'journey', 'cedar', 'forward', 'house', 'delta', 'rapid',
];

const ALL_LENDERS = [...SAFE_LENDERS, ...AMBIGUOUS_LENDERS].sort((a, b) => b.length - a.length);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function parseDollar(str) {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) || val <= 0 ? null : val;
}

function extractAllDollars(line) {
  const re = /\$?([\d,]+\.\d{2})/g;
  const results = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    const val = parseDollar(m[1]);
    if (val !== null) results.push(val);
  }
  return results;
}

function shouldSkipLine(line) {
  return SKIP_PATTERNS.some(p => p.test(line));
}

// ─── TEXTRACT JOB MANAGEMENT ──────────────────────────────────────────────────
async function startJob(s3Key) {
  const res = await textract.send(new StartDocumentTextDetectionCommand({
    DocumentLocation: { S3Object: { Bucket: BUCKET, Name: s3Key } },
  }));
  return res.JobId;
}

async function waitForJob(jobId) {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await textract.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
    if (res.JobStatus === 'SUCCEEDED') return;
    if (res.JobStatus === 'FAILED') throw new Error('Textract job failed');
  }
  throw new Error('Textract job timed out');
}

async function getBlocks(jobId) {
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

// ─── MAIN PARSER ──────────────────────────────────────────────────────────────
function parseFinancials(blocks) {
  const lines = blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => (b.Text || '').trim())
    .filter(Boolean);

  const fullLower = lines.join('\n').toLowerCase();

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 1: Try to find summary credit lines using bank-specific patterns
  // ════════════════════════════════════════════════════════════════════════════
  const summaryHits = [];

  for (const line of lines) {
    if (shouldSkipLine(line)) continue;

    for (const pattern of SUMMARY_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const val = parseDollar(match[1]);
        if (val && val >= 100) {
          summaryHits.push({ value: val, line: line.trim(), pattern: pattern.source });
          console.log(`[Textract] ✓ Summary match: "${line.trim()}" → $${val.toLocaleString()}`);
        }
        break; // one pattern match per line is enough
      }
    }
  }

  // Filter out zero/null accounts if multiple summary lines found
  // If one account has $82k and another has $500, the $500 is a dormant savings — discard it
  let filteredSummary = summaryHits.map(h => h.value);
  if (filteredSummary.length > 1) {
    const maxVal = Math.max(...filteredSummary);
    const threshold = maxVal * 0.10; // anything less than 10% of the largest is a dormant account
    const significant = filteredSummary.filter(v => v >= threshold);
    if (significant.length > 0) filteredSummary = significant;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 2: If no summary found, sum individual deposit transactions
  // ════════════════════════════════════════════════════════════════════════════
  let individualTotal = 0;
  let individualCount = 0;

  if (filteredSummary.length === 0) {
    console.log('[Textract] No summary lines found, falling back to individual credit detection');

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (shouldSkipLine(line)) continue;

      const amounts = extractAllDollars(line);
      if (!amounts.length) continue;

      // Only count lines that are clearly credits/deposits
      const isCredit = /\b(deposit|credit|cr\b|incoming|received|transfer\s+in|direct\s+dep|payroll|ach\s+credit|wire\s+in|mobile\s+deposit|atm\s+deposit|direct\s+deposit)\b/i.test(lower);
      const isDebit = /\b(debit|dr\b|withdrawal|withdraw|payment|purchase|pos\b|ach\s+debit|wire\s+out|check\b|fee\b|charge|transfer\s+out)\b/i.test(lower);

      // Must be explicitly a credit, not ambiguous
      // If both credit and debit keywords found, check which appears first
      if (isCredit) {
        if (isDebit) {
          const creditPos = lower.search(/\b(deposit|credit|incoming|received|transfer\s+in|direct\s+dep|payroll|ach\s+credit|wire\s+in)\b/i);
          const debitPos = lower.search(/\b(debit|withdrawal|withdraw|payment|purchase|pos\b|ach\s+debit|wire\s+out|check\b|fee\b|charge|transfer\s+out)\b/i);
          if (creditPos === -1 || (debitPos !== -1 && debitPos < creditPos)) continue;
        }
        const txnAmount = Math.min(...amounts);
        if (txnAmount >= 1 && txnAmount <= 5000000) {
          individualTotal += txnAmount;
          individualCount++;
        }
      }
    }
    console.log(`[Textract] Individual credits: ${individualCount} transactions, total: $${individualTotal.toLocaleString()}`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 3: Determine months covered
  // ════════════════════════════════════════════════════════════════════════════
  const monthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
  const foundMonths = new Set();
  let mm;
  while ((mm = monthRe.exec(fullLower)) !== null) {
    foundMonths.add(mm[1].slice(0, 3));
  }

  // If we found summary lines, use their count as months (more reliable)
  let monthsCovered;
  if (filteredSummary.length > 0) {
    monthsCovered = filteredSummary.length;
  } else {
    monthsCovered = Math.max(foundMonths.size, 1);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 4: Calculate revenue
  // ════════════════════════════════════════════════════════════════════════════
  let totalCredits;
  let numberOfDeposits;
  let method;

  const summaryTotal = filteredSummary.reduce((s, v) => s + v, 0);

  if (summaryTotal > 0) {
    totalCredits = summaryTotal;
    numberOfDeposits = filteredSummary.length;
    method = 'summary';
  } else if (individualTotal > 0) {
    totalCredits = individualTotal;
    numberOfDeposits = individualCount;
    method = 'individual';
  } else {
    totalCredits = 0;
    numberOfDeposits = 0;
    method = 'none';
  }

  const avgMonthlyRevenue = totalCredits > 0 ? Math.round(totalCredits / monthsCovered) : null;
  const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

  console.log(`[Textract] RESULT: method=${method} | total=$${totalCredits.toLocaleString()} | months=${monthsCovered} | avg=$${(avgMonthlyRevenue || 0).toLocaleString()}`);

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 5: Negative days
  // ════════════════════════════════════════════════════════════════════════════
  const negRe = /(-\$[\d,]+\.?\d{0,2}|\bOD\b|overdraft|nsf|insufficient\s+funds|negative\s+balance)/gi;
  const negMatches = fullLower.match(negRe) || [];
  const negativeDays = negMatches.length;

  // ════════════════════════════════════════════════════════════════════════════
  // STEP 6: Lender detection
  // ════════════════════════════════════════════════════════════════════════════
  const detectedLenders = {};
  for (const line of lines) {
    const lower = line.toLowerCase();
    const amounts = extractAllDollars(line);
    const hasDollar = amounts.length > 0;

    for (const kw of ALL_LENDERS) {
      if (!lower.includes(kw)) continue;
      if (AMBIGUOUS_LENDERS.includes(kw) && !hasDollar) continue;

      const name = kw.charAt(0).toUpperCase() + kw.slice(1);
      if (!detectedLenders[name]) detectedLenders[name] = { name, totalPaid: 0, occurrences: 0 };
      detectedLenders[name].occurrences++;
      if (hasDollar) detectedLenders[name].totalPaid += amounts.reduce((a, b) => a + b, 0);
      break; // one lender match per line
    }
  }

  const positions = Object.values(detectedLenders).filter(l => l.occurrences > 0);
  const totalLenderPayments = positions.reduce((s, l) => s + l.totalPaid, 0);
  const withholdingRate = avgMonthlyRevenue && totalLenderPayments > 0
    ? parseFloat((totalLenderPayments / avgMonthlyRevenue * 100).toFixed(1)) : 0;

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
    method,
    summaryHits: summaryHits.length,
    extractedAt: new Date().toISOString(),
    confidence: method === 'summary' ? 'high' : method === 'individual' ? 'medium' : 'low',
  };
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
async function extractBankStatement(s3Key) {
  try {
    const jobId = await startJob(s3Key);
    await waitForJob(jobId);
    const blocks = await getBlocks(jobId);
    const financials = parseFinancials(blocks);
    return { success: true, jobId, ...financials };
  } catch (err) {
    console.error('[Textract] Error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { extractBankStatement };
