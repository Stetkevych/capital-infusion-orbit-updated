// Direct test — require the actual module and test parseFinancials
// We can't call extractBankStatement (needs AWS) but we can test the parser

// Monkey-patch the AWS client so require doesn't fail
const mockTextract = { send: () => {} };
require.cache[require.resolve('@aws-sdk/client-textract')] = {
  id: '@aws-sdk/client-textract',
  exports: {
    TextractClient: function() { return mockTextract; },
    StartDocumentTextDetectionCommand: function() {},
    GetDocumentTextDetectionCommand: function() {},
  },
  loaded: true,
};

// Now we can safely read the source and eval just parseFinancials
const fs = require('fs');
const src = fs.readFileSync('./server/src/services/textractService.js', 'utf8');

// Extract everything between the constants and module.exports
const fn = new Function('require', `
  ${src.replace("module.exports = { extractBankStatement };", "")}
  return parseFinancials;
`);

const parseFinancials = fn(require);

function B(lines) {
  return lines.map(t => ({ BlockType: 'LINE', Text: t }));
}

const tests = [
  { name: 'Chase $7,500', exp: 7500, lines: ['CHASE BUSINESS CHECKING','January 2026','Beginning Balance $3,200.45','01/05 Deposit $2,500.00 $5,700.45','01/12 ACH Credit PAYMENT $3,000.00 $8,700.45','01/20 Mobile Deposit $2,000.00 $10,700.45','Total Deposits and Additions $7,500.00','Total Withdrawals $3,500.00','Ending Balance $7,200.45'] },
  { name: 'Wells Fargo $97k', exp: 97000, lines: ['WELLS FARGO','October 2025','Beginning Balance $12,450.00','Total Credits $97,000.00','Total Debits $85,000.00','Ending Balance $24,450.00'] },
  { name: 'BofA $50k', exp: 50000, lines: ['Bank of America','November 2025','Previous Balance $8,320.11','Total Deposits $50,000.00','Total Withdrawals $42,000.00','Ending Balance $16,320.11'] },
  { name: 'TD $25k', exp: 25000, lines: ['TD BANK','December 2025','Opening Balance $5,100.00','Credits This Period $25,000.00','Debits This Period $20,000.00','Closing Balance $10,100.00'] },
  { name: 'Dual acct: $45k + $0', exp: 45000, lines: ['CHECKING ****1234','February 2026','Total Deposits $45,000.00','Total Withdrawals $40,000.00','Ending Balance $10,000.00','','SAVINGS ****5678','Total Deposits $0.00','Ending Balance $100.00'] },
  { name: 'Dual acct: $82k + $500', exp: 82000, lines: ['PRIMARY CHECKING','March 2026','Total Credits $82,000.00','Total Debits $75,000.00','','SAVINGS','Total Credits $500.00'] },
  { name: 'Colon format $63k', exp: 63000, lines: ['BUSINESS CHECKING','January 2026','Beginning Balance:    $8,500.00','Total Deposits:    $63,000.00','Total Checks:    $45,000.00','Ending Balance:    $26,350.00'] },
  { name: 'Credits in this period $112k', exp: 112000, lines: ['TD COMMERCIAL','Jan 2026','Balance Forward $22,000.00','Credits in this period $112,000.00','Debits in this period $98,000.00'] },
  { name: 'Deposits & Other Credits $28,750', exp: 28750, lines: ['JPMorgan Chase','February 2026','Beginning Balance $4,100.00','Deposits & Other Credits $28,750.00','Checks & Other Debits $25,000.00','Ending Balance $7,850.00'] },
  { name: 'High rev $485k', exp: 485000, lines: ['CITIBANK','January 2026','Previous Balance $125,000.00','Total Deposits and Additions $485,000.00','Total Withdrawals and Debits $460,000.00'] },
  { name: 'Small biz $3,200', exp: 3200, lines: ['COMMUNITY FIRST','March 2026','Beginning Balance $800.00','Total Deposits $3,200.00','Total Withdrawals $2,900.00','Ending Balance $1,100.00'] },
  { name: 'Acct# looks like money', exp: 18500, lines: ['REGIONS BANK','Account Number: 75000-4421-8832','January 2026','Total Deposits $18,500.00','Total Withdrawals $15,000.00','Ending Balance $5,600.00','Page 1 of 3'] },
  { name: 'Big balance, small deposits', exp: 22000, lines: ['US BANK','February 2026','Beginning Balance $150,000.00','Total Credits $22,000.00','Total Debits $18,000.00','Ending Balance $154,000.00','Average Daily Balance $148,500.00'] },
  { name: '3 months: $95k+$100k+$97k', exp: 97333, lines: ['CHASE','Quarterly','','OCTOBER 2025','Total Deposits and Additions $95,000.00','','NOVEMBER 2025','Total Deposits and Additions $100,000.00','','DECEMBER 2025','Total Deposits and Additions $97,000.00'] },
  { name: 'No summary - 4 deposits $12k', exp: 12000, lines: ['COMMUNITY BANK','March 2026','Balance Forward $2,100.00','03/01 Deposit $3,000.00 $5,100.00','03/08 ACH Credit PAYMENT $4,000.00 $9,100.00','03/15 Mobile Deposit $2,500.00 $11,600.00','03/22 Direct Deposit $2,500.00 $14,100.00','03/05 Check #100 $1,000.00 $4,100.00','03/12 ACH Debit RENT $2,000.00 $7,100.00','Ending Balance $9,100.00'] },
  { name: 'No summary - mixed $8,500', exp: 8500, lines: ['LOCAL CU','January 2026','Previous Balance $1,500.00','01/02 ACH Credit PAYROLL $3,500.00 $5,000.00','01/05 POS Purchase WALMART $250.00 $4,750.00','01/09 Wire Transfer In $2,000.00 $6,750.00','01/12 ACH Debit INSURANCE $800.00 $5,950.00','01/15 Deposit $1,500.00 $7,450.00','01/18 Check #445 $600.00 $6,850.00','01/22 ACH Credit REFUND $1,500.00 $8,350.00','01/25 ATM Withdrawal $200.00 $8,150.00','Ending Balance $8,135.00'] },
  { name: 'RBC Canada $65k', exp: 65000, lines: ['RBC ROYAL BANK','January 2026','Opening Balance $8,500.00','Total Credits $65,000.00','Total Debits $58,000.00','Closing Balance $15,500.00'] },
  { name: 'Money In format $55k', exp: 55000, lines: ['ALLY BANK','March 2026','Starting Balance $12,000.00','Total Money In $55,000.00','Total Money Out $48,000.00','Final Balance $19,000.00'] },
  { name: 'Total Incoming $41k', exp: 41000, lines: ['MERCURY','January 2026','Opening Balance $8,000.00','Total Incoming $41,000.00','Total Outgoing $36,000.00','Closing Balance $13,000.00'] },
  { name: 'PNC Total Additions $33,500', exp: 33500, lines: ['PNC BUSINESS','January 2026','Beginning Balance $4,200.00','Total Additions $33,500.00','Total Withdrawals $28,000.00','Ending Balance $9,700.00'] },
];

console.log('\n══════════════════════════════════════════════');
console.log('  TEXTRACT PARSER — 20 TEST CASES');
console.log('══════════════════════════════════════════════\n');

let pass = 0, fail = 0;
for (const t of tests) {
  const r = parseFinancials(B(t.lines));
  const got = r.avgMonthlyRevenue || 0;
  const ok = Math.abs(got - t.exp) <= t.exp * 0.15;
  if (ok) { pass++; console.log(`✅ ${t.name} — expected $${t.exp.toLocaleString()}, got $${got.toLocaleString()} [${r.method}]`); }
  else { fail++; console.log(`❌ ${t.name} — expected $${t.exp.toLocaleString()}, got $${got.toLocaleString()} [${r.method}] total=$${r.totalCredits.toLocaleString()} months=${r.monthsCovered}`); }
}

console.log(`\n══════════════════════════════════════════════`);
console.log(`  ${pass}/${tests.length} PASSED${fail ? ` — ${fail} FAILED` : ' — ALL CLEAR ✓'}`);
console.log(`══════════════════════════════════════════════\n`);
