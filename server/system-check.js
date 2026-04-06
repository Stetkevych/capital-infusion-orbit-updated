const https = require('https');
function api(m, p, b, t) {
  return new Promise((r, j) => {
    const d = b ? JSON.stringify(b) : '';
    const u = new URL('https://api.orbit-technology.com/api' + p);
    const o = { hostname: u.hostname, path: u.pathname, method: m, headers: { 'Content-Type': 'application/json' } };
    if (d) o.headers['Content-Length'] = Buffer.byteLength(d);
    if (t) o.headers.Authorization = 'Bearer ' + t;
    const q = https.request(o, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { r(JSON.parse(b)); } catch { r(b); } }); });
    q.on('error', j); if (d) q.write(d); q.end();
  });
}

async function main() {
  console.log('========================================');
  console.log('  ORBIT PLATFORM - FULL SYSTEM CHECK');
  console.log('========================================\n');
  let pass = 0, fail = 0;
  function ok(name) { console.log('  OK   ' + name); pass++; }
  function no(name, d) { console.log('  FAIL ' + name + ' - ' + d); fail++; }

  const health = await api('GET', '/health');
  health.status === 'healthy' ? ok('1. Server health') : no('1. Server health', JSON.stringify(health));

  const admin = await api('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  admin.token ? ok('2. Admin login (Alex)') : no('2. Admin login', admin.message);
  const t = admin.token;

  const nik = await api('POST', '/auth/login', { email: 'nikholas@capital-infusion.com', password: 'Nikholas2026!' });
  nik.token ? ok('3. Rep login (Nikholas)') : no('3. Rep login', nik.message);

  const chris = await api('POST', '/auth/login', { email: 'christopher.cranton@gmail.com', password: '841b660259' });
  chris.token ? ok('4. Client login (Christopher)') : no('4. Client login', chris.message || 'failed');

  const users = await api('GET', '/auth/users', null, t);
  Array.isArray(users) && users.length > 10 ? ok('5. Users endpoint (' + users.length + ' users)') : no('5. Users', 'count: ' + (users.length || 0));

  const creds = await api('GET', '/auth/client-credentials', null, t);
  Array.isArray(creds) && creds.length > 0 ? ok('6. Client credentials (' + creds.length + ' clients)') : no('6. Client credentials', 'empty');

  const allClients = await api('GET', '/clients-api', null, t);
  Array.isArray(allClients) && allClients.length > 10 ? ok('7. Clients API admin (' + allClients.length + ' clients)') : no('7. Clients API', 'count: ' + (allClients.length || 0));

  const nikClients = await api('GET', '/clients-api', null, nik.token);
  Array.isArray(nikClients) && nikClients.length > 0 ? ok('8. Clients API rep (Nik sees ' + nikClients.length + ')') : no('8. Clients API rep', '0 clients');

  const hardin = nikClients.find(c => c.ownerName && c.ownerName.includes('Hardin'));
  hardin ? ok('9. James Hardin visible to Nik') : no('9. James Hardin', 'not found');

  const docs = await api('GET', '/documents/client/all', null, t);
  Array.isArray(docs) && docs.length > 10 ? ok('10. Documents (' + docs.length + ' docs)') : no('10. Documents', 'count: ' + (docs.length || 0));

  const fin = await api('GET', '/documents/financials/43d406a7-1294-479b-8716-bf9e18c41bdb', null, t);
  fin.available && fin.avgMonthlyRevenue > 0 ? ok('11. Textract financials ($' + fin.avgMonthlyRevenue.toLocaleString() + '/mo)') : no('11. Textract', 'not available');

  const activity = await api('GET', '/activity', null, t);
  Array.isArray(activity) ? ok('12. Activity log (' + activity.length + ' entries)') : no('12. Activity', 'not array');

  const comm = await api('POST', '/commissions/calculate', { funding: 50000, payback: 67500, payment: 562.5, term: 120, buyRate: 1.25, sellRate: 1.35, points: 2, dealType: 'new_unit', leadSource: 'organic', sameRep: true, packageType: 'none' }, t);
  comm.totalPayoutDollars > 0 ? ok('13. Commission calculator ($' + comm.totalPayoutDollars + ')') : no('13. Commission', JSON.stringify(comm).slice(0, 80));

  const repEmails = ['careem@', 'jamar@', 'nikholas@', 'jonathanm@', 'emilio@', 'cipriani@', 'blake@', 'juans@', 'ken@', 'kevinm@', 'cristian@', 'jasmin@', 'anderson@', 'evan@', 'santiago@'];
  const allFound = repEmails.every(e => users.some(u => u.email.startsWith(e)));
  allFound ? ok('14. All 15 rep/admin accounts exist') : no('14. Accounts', 'missing');

  const dsgnDocs = docs.filter(d => d.uploadedBy === 'docusign');
  dsgnDocs.length > 0 ? ok('15. DocuSign poller (' + dsgnDocs.length + ' auto-stored)') : no('15. DocuSign', 'no docs');

  const bsDocs = docs.filter(d => d.category === 'bank_statements' && d.extractedFinancials?.success);
  bsDocs.length > 0 ? ok('16. Textract processed (' + bsDocs.length + ' statements)') : no('16. Textract', 'none');

  const inflated = bsDocs.filter(d => d.extractedFinancials.avgMonthlyRevenue > 500000);
  inflated.length === 0 ? ok('17. No inflated extractions') : no('17. Inflated', inflated.length + ' over $500k');

  const highNeg = bsDocs.filter(d => d.extractedFinancials.negativeDays > 10);
  highNeg.length === 0 ? ok('18. Negative days sane (all <10)') : no('18. Neg days', highNeg.length + ' over 10');

  const summaryDocs = bsDocs.filter(d => d.extractedFinancials.method === 'summary');
  summaryDocs.length > 0 ? ok('19. Summary method working (' + summaryDocs.length + ' docs)') : no('19. Summary', 'none');

  const posDocs = bsDocs.filter(d => d.extractedFinancials.positionCount > 0);
  posDocs.length > 0 ? ok('20. Lender detection working (' + posDocs.length + ' docs with positions)') : no('20. Lender', 'none');

  console.log('\n========================================');
  console.log('  RESULTS: ' + pass + '/20 passed, ' + fail + ' failed');
  console.log('========================================');
}
main().catch(e => console.error('FATAL:', e.message));
