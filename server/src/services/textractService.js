const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand, StartDocumentAnalysisCommand, GetDocumentAnalysisCommand } = require('@aws-sdk/client-textract');

const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const REGION = process.env.AWS_REGION || 'us-east-1';
const textract = new TextractClient({ region: REGION });

// ─── BANK SUMMARY PATTERNS ───────────────────────────────────────────────────
const SUMMARY_PATTERNS = [
  // Credit union: "19 Credit(s) This Period $98,189.01"
  /\d+\s+credit.?s.?\s+this\s+period\s*.?([\d,]+\.\d{2})/i,
  // English patterns
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
  // Canadian English
  /total\s+credits?\s+\(CAD\)\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  // French / Canadian French (comma as decimal: 27488,06)
  /total\s+des\s+cr[e\u00e9]dits?\s*[:\s]*\$?([\d][\d\s]*,\d{2})/i,
  /total\s+des\s+d[e\u00e9]p[o\u00f4]ts?\s*[:\s]*\$?([\d][\d\s]*,\d{2})/i,
  /d[e\u00e9]p[o\u00f4]ts?\s*[:\+\s]*\$?([\d][\d\s]*,\d{2})/i,
  // Spanish
  /total\s+(?:de\s+)?dep[o\u00f3]sitos?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /total\s+(?:de\s+)?cr[e\u00e9]ditos?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /dep[o\u00f3]sitos?\s+totales?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
  /ingresos?\s+totales?\s*[:\s]*\$?([\d,]+\.\d{2})/i,
];

// Lines to SKIP
const SKIP_PATTERNS = [
  /total\s+(?:debits?|withdrawals?|checks?|fees?|charges?|payments?)/i,
  /total\s+(?:money\s+out|outgoing)/i,
  /\d+\s+debit.?s.?\s+this\s+period/i,
  /ending\s+balance/i,
  /beginning\s+balance/i,
  /opening\s+balance/i,
  /closing\s+balance/i,
  /available\s+balance/i,
  /current\s+balance/i,
  /minimum\s+balance/i,
  /average\s+(?:daily\s+)?(?:ledger\s+)?balance/i,
  /overdraft/i,
  /interest\s+(?:earned|paid|charged|days)/i,
  /annual\s+percentage/i,
  /service\s+(?:charge|fee)/i,
  /account\s+(?:number|summary|type)/i,
  /member\s+number/i,
  /phone\s+number/i,
  /statement\s+(?:period|ending)/i,
  /page\s+\d/i,
  /total\s+current\s+value/i,
  /total\s+(?:for\s+this|year)/i,
  /total\s+(?:overdraft|returned)/i,
  // French
  /retraits?\s/i,
  /solde\s+(?:d['\u2019]ouverture|de\s+cl[o\u00f4]ture|report\u00e9)/i,
  /frais\s+(?:de\s+service|maximum)/i,
  /int[e\u00e9]r[e\u00ea]t\s+sur/i,
  /d[e\u00e9]couvert/i,
  // Spanish
  /saldo\s+(?:inicial|final|disponible)/i,
  /total\s+(?:de\s+)?(?:retiros?|d[e\u00e9]bitos?|cargos?)/i,
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
  'specialty', 'rtmi', 'afb', 'afg', 'pirs', 'gfe', 'nexi',
  '2m7', 'legend', 'headway', 'newco', 'vader', 'rapid finance',
  'arsenal', 'bitty', 'mca servicing', 'strategic funding',
  'cfgms', 'eminent funding', 'ebf holdings',
];

const AMBIGUOUS_LENDERS = [
  'idea', 'channel', 'can', 'wall', 'lg', 'fox', 'pearl', 'lily',
  'garden', 'journey', 'cedar', 'forward', 'house', 'delta', 'rapid',
];

const ALL_LENDERS = [...SAFE_LENDERS, ...AMBIGUOUS_LENDERS].sort((a, b) => b.length - a.length);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function parseDollar(str) {
  if (!str) return null;
  let cleaned = str.replace(/[$\s]/g, '');
  // French format: comma as decimal (27488,06)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',');
    const afterComma = cleaned.slice(lastComma + 1);
    if (afterComma.length <= 2) {
      cleaned = cleaned.slice(0, lastComma).replace(/,/g, '') + '.' + afterComma;
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }
  const val = parseFloat(cleaned);
  return isNaN(val) || val <= 0 ? null : val;
}

function extractAllDollars(line) {
  const results = [];
  // STRICT: only match proper dollar amounts — $1,234.56 or standalone 1,234.56
  // Must have $ sign OR be a number with exactly 2 decimal places
  const re = /\$([\d,]+\.\d{2})\b/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const val = parseDollar(m[1]);
    if (val !== null) results.push(val);
  }
  // If no $ signs found, try bare amounts with .XX decimal (but NOT phone numbers like 800.411.7590)
  if (results.length === 0) {
    const bareRe = /(?:^|\s)([\d,]+\.\d{2})(?:\s|$)/g;
    while ((m = bareRe.exec(line)) !== null) {
      const raw = m[1];
      // Skip if it looks like a phone number (has multiple dots) or too many digits without commas
      if ((raw.match(/\./g) || []).length > 1) continue;
      const val = parseDollar(raw);
      if (val !== null) results.push(val);
    }
  }
  // French format: 27488,06 $
  if (results.length === 0) {
    const frRe = /([\d][\d\s]*,\d{2})\s*\$/g;
    while ((m = frRe.exec(line)) !== null) {
      const val = parseDollar(m[1]);
      if (val !== null) results.push(val);
    }
  }
  return results;
}

function shouldSkipLine(line) {
  return SKIP_PATTERNS.some(p => p.test(line));
}

// ─── TEXTRACT JOB MANAGEMENT ──────────────────────────────────────────────────
async function startJob(s3Key) {
  const res = await textract.send(new StartDocumentAnalysisCommand({
    DocumentLocation: { S3Object: { Bucket: BUCKET, Name: s3Key } },
    FeatureTypes: ['TABLES'],
  }));
  return res.JobId;
}

async function waitForJob(jobId) {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const res = await textract.send(new GetDocumentAnalysisCommand({ JobId: jobId }));
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
    const res = await textract.send(new GetDocumentAnalysisCommand(params));
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

  // Pre-process: join lines split across Textract lines
  const joinedLines = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (/(?:total|d[e\u00e9]p[o\u00f4]ts?|credit|deposit|cr[e\u00e9]dits?|incoming|money\s+in|this\s+period)/i.test(line) && !/\$[\d,]+\.\d{2}/.test(line) && !/[\d][\d\s]*,\d{2}\s*\$/.test(line)) {
      let combined = line;
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        combined += ' ' + lines[j];
        if (/\$[\d,]+\.\d{2}/.test(lines[j]) || /[\d][\d\s]*,\d{2}\s*\$/.test(lines[j])) { i = j; break; }
      }
      joinedLines.push(combined);
    } else {
      joinedLines.push(line);
    }
  }

  const fullLower = joinedLines.join('\n').toLowerCase();

  // STEP 1: Summary credit lines
  const summaryHits = [];
  for (const line of joinedLines) {
    if (shouldSkipLine(line)) continue;
    for (const pattern of SUMMARY_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const val = parseDollar(match[1]);
        if (val && val >= 100) {
          summaryHits.push({ value: val, line: line.trim(), pattern: pattern.source });
          console.log(`[Textract] \u2713 Summary match: "${line.trim()}" \u2192 $${val.toLocaleString()}`);
        }
        break;
      }
    }
  }

  // Filter dormant accounts (10% threshold)
  let filteredSummary = summaryHits.map(h => h.value);
  if (filteredSummary.length > 1) {
    const maxVal = Math.max(...filteredSummary);
    const threshold = maxVal * 0.10;
    const significant = filteredSummary.filter(v => v >= threshold);
    if (significant.length > 0) filteredSummary = significant;
  }

  // STEP 2: Individual deposit fallback
  let individualTotal = 0;
  let individualCount = 0;

  if (filteredSummary.length === 0) {
    console.log('[Textract] No summary lines found, falling back to individual credit detection');
    for (const line of joinedLines) {
      const lower = line.toLowerCase();
      if (shouldSkipLine(line)) continue;

      const amounts = extractAllDollars(line);
      if (!amounts.length) continue;

      const isCredit = /\b(deposit|credit|cr\b|incoming|received|transfer\s+in|direct\s+dep|payroll|ach\s+credit|wire\s+in|wire\s+deposit|mobile\s+deposit|atm\s+deposit|direct\s+deposit)\b/i.test(lower);
      const isDebit = /\b(debit|dr\b|withdrawal|withdraw|payment|purchase|pos\b|ach\s+debit|wire\s+out|check\b|fee\b|charge|transfer\s+out)\b/i.test(lower);

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

  // STEP 3: Months covered
  const monthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b/gi;
  const foundMonths = new Set();
  let mm;
  while ((mm = monthRe.exec(fullLower)) !== null) {
    foundMonths.add(mm[1].slice(0, 3));
  }
  let monthsCovered;
  if (filteredSummary.length > 0) {
    monthsCovered = filteredSummary.length;
  } else {
    monthsCovered = Math.max(foundMonths.size, 1);
  }

  // STEP 4: Calculate revenue
  let totalCredits, numberOfDeposits, method;
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

  // STEP 5: Negative days
  const negRe = /(-\$[\d,]+\.?\d{0,2}|\bOD\b|overdraft|nsf|insufficient\s+funds|negative\s+balance)/gi;
  const negMatches = fullLower.match(negRe) || [];
  const negativeDays = negMatches.length;

  // STEP 6: Lender detection
  const detectedLenders = {};
  for (const line of joinedLines) {
    const lower = line.toLowerCase();
    const amounts = extractAllDollars(line);
    const hasDollar = amounts.length > 0;

    for (const kw of ALL_LENDERS) {
      if (!lower.includes(kw)) continue;
      if (AMBIGUOUS_LENDERS.includes(kw) && !hasDollar) continue;
      // Skip if the keyword is part of a longer word (e.g. "can" in "scanning")
      const kwRe = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (!kwRe.test(lower)) continue;

      const name = kw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      if (!detectedLenders[name]) detectedLenders[name] = { name, totalPaid: 0, occurrences: 0 };
      detectedLenders[name].occurrences++;
      if (hasDollar) detectedLenders[name].totalPaid += amounts.reduce((a, b) => a + b, 0);
      break;
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

async function extractRawLines(s3Key) {
  try {
    const jobId = await startJob(s3Key);
    await waitForJob(jobId);
    const blocks = await getBlocks(jobId);
    const lines = blocks
      .filter(b => b.BlockType === 'LINE')
      .map(b => (b.Text || '').trim())
      .filter(Boolean);
    return { success: true, lineCount: lines.length, lines };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { extractBankStatement, extractRawLines };
