/**
 * STRESS TEST — textractService.js parseFinancials()
 * 30 brutal edge cases designed to break the parser
 */

const fs = require('fs');
let src = fs.readFileSync(__dirname + '/src/services/textractService.js', 'utf8');

// Strip out AWS SDK imports and module.exports, wrap in a function that returns parseFinancials
src = src.replace(/const \{[^}]*\}\s*=\s*require\([^)]*\);/g, '')
         .replace(/const BUCKET[^;]*;/, '')
         .replace(/const REGION[^;]*;/, '')
         .replace(/const textract[^;]*;/, '')
         .replace(/module\.exports[^;]*;/, '')
         .replace(/async function startJob[\s\S]*?^\}/m, '')
         .replace(/async function waitForJob[\s\S]*?^\}/m, '')
         .replace(/async function getBlocks[\s\S]*?^\}/m, '')
         .replace(/async function extractBankStatement[\s\S]*?^\}/m, '');

const factory = new Function(src + '\nreturn parseFinancials;');
const parseFinancials = factory();

// Helper: turn array of strings into Textract-style blocks
function makeBlocks(lines) {
  return lines.map(text => ({ BlockType: 'LINE', Text: text }));
}

let passed = 0;
let failed = 0;
const failures = [];

function test(name, lines, checks) {
  const result = parseFinancials(makeBlocks(lines));
  const errors = [];

  for (const [key, expected] of Object.entries(checks)) {
    const actual = result[key];
    if (typeof expected === 'function') {
      if (!expected(actual)) errors.push(`  ${key}: got ${JSON.stringify(actual)}, failed predicate`);
    } else if (actual !== expected) {
      errors.push(`  ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  if (errors.length === 0) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    errors.forEach(e => console.log(e));
    failed++;
    failures.push(name);
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('  TEXTRACT STRESS TEST — 30 EDGE CASES');
console.log('═══════════════════════════════════════════════════════════\n');

// ──────────────────────────────────────────────────────────────────────────────
// 1. Chase Business — standard summary
// ──────────────────────────────────────────────────────────────────────────────
test('1. Chase Business — standard summary', [
  'CHASE BUSINESS CHECKING',
  'Statement Period: January 1 - January 31, 2024',
  'Beginning Balance $15,432.10',
  'Total Deposits and Additions $87,654.32',
  'Total Withdrawals and Debits $72,100.00',
  'Ending Balance $30,986.42',
], { avgMonthlyRevenue: 87654, method: 'summary', monthsCovered: 1, confidence: 'high' });

// ──────────────────────────────────────────────────────────────────────────────
// 2. Wells Fargo — "Deposits & Other Credits" format
// ──────────────────────────────────────────────────────────────────────────────
test('2. Wells Fargo — deposits & other credits', [
  'WELLS FARGO BUSINESS CHECKING',
  'Statement Period: February 2024',
  'Beginning Balance $22,000.00',
  'Deposits & Other Credits $134,567.89',
  'Checks & Other Debits $120,000.00',
  'Ending Balance $36,567.89',
], { avgMonthlyRevenue: 134568, method: 'summary', monthsCovered: 1 });

// ──────────────────────────────────────────────────────────────────────────────
// 3. BofA — "Credits This Period"
// ──────────────────────────────────────────────────────────────────────────────
test('3. BofA — credits this period', [
  'Bank of America Business Advantage',
  'March 1, 2024 through March 31, 2024',
  'Opening Balance $8,200.00',
  'Total Credits This Period $56,789.12',
  'Total Debits This Period $48,000.00',
  'Closing Balance $17,989.12',
], { avgMonthlyRevenue: 56789, method: 'summary', monthsCovered: 1 });

// ──────────────────────────────────────────────────────────────────────────────
// 4. Multi-month PDF — 3 months of Chase summaries
// ──────────────────────────────────────────────────────────────────────────────
test('4. Multi-month — 3 Chase summaries', [
  'January 2024 Statement',
  'Total Deposits and Additions $45,000.00',
  'Total Withdrawals $40,000.00',
  'Ending Balance $12,000.00',
  'February 2024 Statement',
  'Total Deposits and Additions $52,000.00',
  'Total Withdrawals $47,000.00',
  'Ending Balance $17,000.00',
  'March 2024 Statement',
  'Total Deposits and Additions $48,000.00',
  'Total Withdrawals $44,000.00',
  'Ending Balance $21,000.00',
], { avgMonthlyRevenue: 48333, method: 'summary', monthsCovered: 3, totalCredits: v => v === 145000 });

// ──────────────────────────────────────────────────────────────────────────────
// 5. Dormant savings mixed with active checking — 10% threshold
// ──────────────────────────────────────────────────────────────────────────────
test('5. Dormant savings ($200) vs active checking ($95k)', [
  'CHECKING ACCOUNT SUMMARY',
  'Total Deposits $95,432.00',
  'Total Withdrawals $88,000.00',
  'SAVINGS ACCOUNT SUMMARY',
  'Total Deposits $200.00',
  'Total Withdrawals $0.00',
], { avgMonthlyRevenue: 95432, method: 'summary', totalCredits: v => v === 95432 });

// ──────────────────────────────────────────────────────────────────────────────
// 6. Two active accounts — both above 10% threshold
// ──────────────────────────────────────────────────────────────────────────────
test('6. Two active accounts — both significant', [
  'OPERATING ACCOUNT',
  'Total Deposits $60,000.00',
  'PAYROLL ACCOUNT',
  'Total Deposits $25,000.00',
], { avgMonthlyRevenue: 42500, method: 'summary', totalCredits: v => v === 85000 });

// ──────────────────────────────────────────────────────────────────────────────
// 7. Skip lines that look like summaries but aren't
// ──────────────────────────────────────────────────────────────────────────────
test('7. Skip balance/fee lines, find real deposits', [
  'Ending Balance $150,000.00',
  'Average Daily Balance $120,000.00',
  'Minimum Balance $5,000.00',
  'Service Charge $35.00',
  'Interest Earned $12.50',
  'Total Deposits $43,210.00',
  'Total Debits $38,000.00',
  'Page 1 of 3',
], { avgMonthlyRevenue: 43210, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 8. Individual credits only — no summary line at all
// ──────────────────────────────────────────────────────────────────────────────
test('8. No summary — individual credits fallback', [
  'Small Business Checking',
  'March 2024',
  '03/01 ACH Credit SHOPIFY $4,200.00',
  '03/05 Mobile Deposit $1,500.00',
  '03/10 Wire In from CLIENT $8,000.00',
  '03/15 ACH Credit STRIPE $3,200.00',
  '03/20 Direct Deposit PAYPAL $2,100.00',
  '03/22 POS Purchase OFFICE DEPOT -$450.00',
  '03/25 ACH Debit RENT -$3,000.00',
], { method: 'individual', avgMonthlyRevenue: 19000, confidence: 'medium' });

// ──────────────────────────────────────────────────────────────────────────────
// 9. "ACH Credit PAYMENT" ambiguity — credit keyword appears first
// ──────────────────────────────────────────────────────────────────────────────
test('9. ACH Credit PAYMENT — credit-first wins', [
  'April 2024',
  '04/01 ACH Credit PAYMENT FROM CUSTOMER $5,000.00',
  '04/10 ACH Credit PAYMENT RECEIVED $3,000.00',
  '04/15 ACH Debit PAYMENT TO VENDOR $2,000.00',
], { method: 'individual', avgMonthlyRevenue: 8000, numberOfDeposits: 2 });

// ──────────────────────────────────────────────────────────────────────────────
// 10. "Payment ACH Credit" — debit keyword first, should SKIP
// ──────────────────────────────────────────────────────────────────────────────
test('10. Payment before Credit — debit-first skipped', [
  'May 2024',
  '05/01 Payment ACH Credit RETURN $5,000.00',
  '05/10 Deposit from CLIENT $2,000.00',
], { method: 'individual', avgMonthlyRevenue: 2000, numberOfDeposits: 1 });

// ──────────────────────────────────────────────────────────────────────────────
// 11. Completely empty statement — no amounts at all
// ──────────────────────────────────────────────────────────────────────────────
test('11. Empty statement — zero everything', [
  'Business Checking Account',
  'Statement Period: June 2024',
  'No transactions this period',
], { avgMonthlyRevenue: null, method: 'none', totalCredits: 0, confidence: 'low' });

// ──────────────────────────────────────────────────────────────────────────────
// 12. Only debits — no credits whatsoever
// ──────────────────────────────────────────────────────────────────────────────
test('12. Only debits — no revenue detected', [
  'July 2024',
  '07/01 ACH Debit RENT $3,500.00',
  '07/05 POS Purchase STAPLES $200.00',
  '07/10 Wire Out to VENDOR $10,000.00',
  '07/15 Check #1042 $1,500.00',
  'Total Debits $15,200.00',
], { avgMonthlyRevenue: null, method: 'none', totalCredits: 0 });

// ──────────────────────────────────────────────────────────────────────────────
// 13. TD Bank format — "Total Credits"
// ──────────────────────────────────────────────────────────────────────────────
test('13. TD Bank — Total Credits format', [
  'TD BANK BUSINESS CHECKING',
  'Statement Period: August 1 - August 31, 2024',
  'Previous Balance $11,200.00',
  'Total Credits: $67,890.45',
  'Total Debits: $59,000.00',
  'Current Balance $20,090.45',
], { avgMonthlyRevenue: 67890, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 14. PNC — "Total Deposits" with colon
// ──────────────────────────────────────────────────────────────────────────────
test('14. PNC — Total Deposits with colon', [
  'PNC BUSINESS CHECKING',
  'September 2024',
  'Total Deposits: $112,345.67',
  'Total Checks: $95,000.00',
  'Total Fees: $45.00',
], { avgMonthlyRevenue: 112346, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 15. Citi — "Total Incoming"
// ──────────────────────────────────────────────────────────────────────────────
test('15. Citi — Total Incoming format', [
  'CITIBANK BUSINESS',
  'October 2024',
  'Total Incoming $78,500.00',
  'Total Outgoing $65,000.00',
], { avgMonthlyRevenue: 78500, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 16. Canadian bank — CAD format
// ──────────────────────────────────────────────────────────────────────────────
test('16. Canadian bank — Total Credits (CAD)', [
  'RBC ROYAL BANK BUSINESS',
  'November 2024',
  'Total Credits (CAD) $54,321.00',
  'Total Debits (CAD) $48,000.00',
], { avgMonthlyRevenue: 54321, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 17. French Canadian — "Total des crédits"
// ──────────────────────────────────────────────────────────────────────────────
test('17. French Canadian — Total des crédits', [
  'BANQUE NATIONALE DU CANADA',
  'Décembre 2024',
  'Total des crédits $41,000.00',
  'Total des débits $35,000.00',
], { avgMonthlyRevenue: 41000, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 18. Mercury / fintech — "Total Money In"
// ──────────────────────────────────────────────────────────────────────────────
test('18. Mercury — Total Money In', [
  'Mercury Business Checking',
  'January 2024',
  'Total Money In $203,456.78',
  'Total Money Out $180,000.00',
], { avgMonthlyRevenue: 203457, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 19. Lender detection — multiple MCA positions
// ──────────────────────────────────────────────────────────────────────────────
test('19. Lender detection — 3 positions', [
  'February 2024',
  'Total Deposits $75,000.00',
  '02/01 ACH Debit FUND SO FAST $850.00',
  '02/05 ACH Debit CREDIBLY $600.00',
  '02/10 ACH Debit ONDECK $450.00',
  '02/15 ACH Credit SHOPIFY $12,000.00',
], { positionCount: 3, method: 'summary', avgMonthlyRevenue: 75000 });

// ──────────────────────────────────────────────────────────────────────────────
// 20. Ambiguous lender names — should NOT match without dollar amounts
// ──────────────────────────────────────────────────────────────────────────────
test('20. Ambiguous lender — no dollar = no match', [
  'March 2024',
  'Total Deposits $50,000.00',
  'The idea was to expand the garden project',
  'Forward planning for the channel strategy',
], { positionCount: 0, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 21. Ambiguous lender WITH dollar — should match
// ──────────────────────────────────────────────────────────────────────────────
test('21. Ambiguous lender with dollar — matches', [
  'April 2024',
  'Total Deposits $50,000.00',
  '04/01 ACH Debit IDEA FINANCIAL $750.00',
  '04/05 ACH Debit RAPID ADVANCE $500.00',
], { positionCount: 2, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 22. Negative days / overdraft detection
// ──────────────────────────────────────────────────────────────────────────────
test('22. Overdraft / NSF detection', [
  'May 2024',
  'Total Deposits $30,000.00',
  '05/03 NSF Fee $35.00',
  '05/10 Overdraft Protection Transfer $500.00',
  '05/15 Balance: -$234.56',
  '05/20 Insufficient Funds Fee $35.00',
], { negativeDays: 5, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 23. Dollar amounts that are too small ($0.01) — should be ignored in summary
// ──────────────────────────────────────────────────────────────────────────────
test('23. Tiny summary amount ($50) — below $100 threshold', [
  'June 2024',
  'Total Deposits $50.00',
  'Total Debits $45.00',
], { avgMonthlyRevenue: null, method: 'none' });

// ──────────────────────────────────────────────────────────────────────────────
// 24. Massive revenue — $2M+ monthly
// ──────────────────────────────────────────────────────────────────────────────
test('24. Massive revenue — $2.1M monthly', [
  'July 2024',
  'Total Deposits and Additions $2,134,567.89',
  'Total Withdrawals $1,900,000.00',
], { avgMonthlyRevenue: 2134568, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 25. Account number that looks like money — should be skipped
// ──────────────────────────────────────────────────────────────────────────────
test('25. Account number in skip line — not counted', [
  'Account Summary for Account Number 1234567890',
  'Statement Period: August 2024',
  'Page 1 of 5',
  'Total Deposits $28,500.00',
  'Total Debits $25,000.00',
], { avgMonthlyRevenue: 28500, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 26. "Total Electronic Deposits" — specific bank format
// ──────────────────────────────────────────────────────────────────────────────
test('26. Total Electronic Deposits format', [
  'US BANK BUSINESS',
  'September 2024',
  'Total Electronic Deposits $91,234.56',
  'Total Electronic Withdrawals $80,000.00',
], { avgMonthlyRevenue: 91235, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 27. "Deposits Total" — reversed word order
// ──────────────────────────────────────────────────────────────────────────────
test('27. Deposits Total — reversed order', [
  'ALLY BANK BUSINESS',
  'October 2024',
  'Deposits Total $63,210.00',
  'Withdrawals Total $55,000.00',
], { avgMonthlyRevenue: 63210, method: 'summary' });

// ──────────────────────────────────────────────────────────────────────────────
// 28. Mixed: summary + individual credits — summary should win
// ──────────────────────────────────────────────────────────────────────────────
test('28. Summary wins over individual credits', [
  'November 2024',
  'Total Deposits $72,000.00',
  '11/01 ACH Credit SHOPIFY $4,200.00',
  '11/05 Mobile Deposit $1,500.00',
  '11/10 Wire In $8,000.00',
], { method: 'summary', avgMonthlyRevenue: 72000 });

// ──────────────────────────────────────────────────────────────────────────────
// 29. Three dormant accounts + one active — only active survives
// ──────────────────────────────────────────────────────────────────────────────
test('29. Three dormant + one active account', [
  'CHECKING',
  'Total Deposits $120,000.00',
  'SAVINGS 1',
  'Total Deposits $500.00',
  'SAVINGS 2',
  'Total Deposits $150.00',
  'MONEY MARKET',
  'Total Deposits $300.00',
], { avgMonthlyRevenue: 120000, method: 'summary', totalCredits: v => v === 120000 });

// ──────────────────────────────────────────────────────────────────────────────
// 30. Withholding rate calculation — lender payments vs revenue
// ──────────────────────────────────────────────────────────────────────────────
test('30. Withholding rate — 20% of revenue to lenders', [
  'December 2024',
  'Total Deposits $100,000.00',
  '12/01 ACH Debit FUND SO FAST $850.00',
  '12/02 ACH Debit FUND SO FAST $850.00',
  '12/03 ACH Debit FUND SO FAST $850.00',
  '12/04 ACH Debit FUND SO FAST $850.00',
  '12/05 ACH Debit FUND SO FAST $850.00',
  '12/08 ACH Debit CREDIBLY $600.00',
  '12/09 ACH Debit CREDIBLY $600.00',
  '12/10 ACH Debit CREDIBLY $600.00',
  '12/11 ACH Debit CREDIBLY $600.00',
  '12/12 ACH Debit CREDIBLY $600.00',
], {
  avgMonthlyRevenue: 100000,
  positionCount: 2,
  withholdingRate: v => v > 0 && v < 100,
  totalLenderPayments: v => v === 7250,
});

// ══════════════════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed}`);
if (failures.length > 0) {
  console.log(`  FAILURES: ${failures.join(', ')}`);
}
console.log('═══════════════════════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
