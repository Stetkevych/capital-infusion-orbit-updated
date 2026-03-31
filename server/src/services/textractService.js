const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require('@aws-sdk/client-textract');

const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const REGION = process.env.AWS_REGION || 'us-east-1';

const textract = new TextractClient({ region: REGION });

// ─── Start async Textract job ─────────────────────────────────────────────────
async function startTextractJob(s3Key) {
  const cmd = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: { Bucket: BUCKET, Name: s3Key },
    },
  });
  const res = await textract.send(cmd);
  return res.JobId;
}

// ─── Poll until job completes (max 60s) ───────────────────────────────────────
async function waitForJob(jobId) {
  for (let i = 0; i < 20; i++) {
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
  let nextToken = undefined;
  do {
    const params = { JobId: jobId };
    if (nextToken) params.NextToken = nextToken;
    const res = await textract.send(new GetDocumentTextDetectionCommand(params));
    blocks = blocks.concat(res.Blocks || []);
    nextToken = res.NextToken;
  } while (nextToken);
  return blocks;
}

// ─── Parse raw text lines into financial data ─────────────────────────────────
function parseFinancials(blocks) {
  const lines = blocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => b.Text || '');

  const fullText = lines.join('\n');

  // ── Deposit detection ──────────────────────────────────────────────────────
  // Match lines with dollar amounts that look like credits/deposits
  const depositPattern = /\+?\$?([\d,]+\.?\d{0,2})\s*(CR|credit|deposit|DEP)/gi;
  const amountPattern = /\$?([\d,]+\.\d{2})/g;

  const depositAmounts = [];
  let match;

  // Look for explicit deposit/credit lines
  while ((match = depositPattern.exec(fullText)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (val > 10 && val < 10000000) depositAmounts.push(val);
  }

  // Fallback: scan for lines containing "deposit" or "credit" keywords
  lines.forEach(line => {
    const lower = line.toLowerCase();
    if (lower.includes('deposit') || lower.includes(' cr ') || lower.includes('credit')) {
      const nums = line.match(amountPattern);
      if (nums) {
        nums.forEach(n => {
          const val = parseFloat(n.replace(/[$,]/g, ''));
          if (val > 10 && val < 10000000) depositAmounts.push(val);
        });
      }
    }
  });

  // ── Negative day detection ─────────────────────────────────────────────────
  // Count lines with negative balance indicators
  const negativePattern = /(-\$[\d,]+\.?\d{0,2}|\$[\d,]+\.?\d{0,2}-|\bOD\b|overdraft|nsf|insufficient)/gi;
  const negativeMatches = fullText.match(negativePattern) || [];
  const negativeDays = Math.min(negativeMatches.length, 30);

  // ── Monthly revenue estimation ─────────────────────────────────────────────
  // Try to find ending/beginning balances or total deposits per month
  const balancePattern = /(?:ending|closing|total deposits?)[^\d]*\$?([\d,]+\.?\d{0,2})/gi;
  const balances = [];
  while ((match = balancePattern.exec(fullText)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''));
    if (val > 100) balances.push(val);
  }

  // ── Determine months covered ───────────────────────────────────────────────
  const monthNames = /january|february|march|april|may|june|july|august|september|october|november|december/gi;
  const monthMatches = fullText.match(monthNames) || [];
  const uniqueMonths = new Set(monthMatches.map(m => m.toLowerCase()));
  const monthsCovered = Math.max(uniqueMonths.size, 1);

  // ── Calculate financials ───────────────────────────────────────────────────
  const totalDeposits = depositAmounts.reduce((a, b) => a + b, 0);
  const numberOfDeposits = depositAmounts.length;

  let avgMonthlyRevenue;
  if (totalDeposits > 0) {
    avgMonthlyRevenue = Math.round(totalDeposits / monthsCovered);
  } else if (balances.length > 0) {
    avgMonthlyRevenue = Math.round(balances.reduce((a, b) => a + b, 0) / balances.length);
  } else {
    // Could not extract — return null so UI shows warning
    avgMonthlyRevenue = null;
  }

  const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

  return {
    avgMonthlyRevenue,
    estimatedAnnualRevenue,
    numberOfDeposits,
    negativeDays,
    monthsCovered,
    totalDeposits: Math.round(totalDeposits),
    extractedAt: new Date().toISOString(),
    confidence: avgMonthlyRevenue ? 'high' : 'low',
  };
}

// ─── Main export: run full extraction pipeline ────────────────────────────────
async function extractBankStatement(s3Key) {
  try {
    const jobId = await startTextractJob(s3Key);
    const result = await waitForJob(jobId);
    const blocks = await getAllBlocks(jobId);
    const financials = parseFinancials(blocks);
    return { success: true, jobId, ...financials };
  } catch (err) {
    console.error('[Textract] Extraction error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { extractBankStatement };
