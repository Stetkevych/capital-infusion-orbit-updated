const API = 'https://api.orbit-technology.com/api';

(async () => {
  // Login as admin
  const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }) })).json();
  const headers = { Authorization: `Bearer ${token}` };

  // Get all clients and check the ones that should be Cristian's and Kip's
  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  
  const cristianClients = ['jorge alejandro cardenas', 'hiba owainat'];
  const kipClients = ['christopher toombs', 'ayodele olatunji'];
  
  console.log('=== CRISTIAN CLIENTS ===');
  for (const name of cristianClients) {
    const c = clients.find(cl => (cl.ownerName || '').toLowerCase().trim() === name);
    if (c) console.log(`  ${c.ownerName}: assignedRepId=${c.assignedRepId} assignedRepName=${c.assignedRepName}`);
    else console.log(`  NOT FOUND: ${name}`);
  }
  
  console.log('\n=== KIP CLIENTS ===');
  for (const name of kipClients) {
    const c = clients.find(cl => (cl.ownerName || '').toLowerCase().trim() === name);
    if (c) console.log(`  ${c.ownerName}: assignedRepId=${c.assignedRepId} assignedRepName=${c.assignedRepName}`);
    else console.log(`  NOT FOUND: ${name}`);
  }

  // Now check what Cristian and Kip's login returns
  for (const [name, email, pass] of [['Cristian', 'cristian@capital-infusion.com', 'Cristian2026!'], ['Kip', 'kip@capital-infusion.com', 'Kip2026!']]) {
    const lr = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const ld = await lr.json();
    if (!lr.ok) { console.log(`\n${name} LOGIN FAILED`); continue; }
    console.log(`\n${name} user: id=${ld.user.id} rep_id=${ld.user.rep_id||'null'} repId=${ld.user.repId||'null'} role=${ld.user.role}`);
    // The lookup does [user.rep_id, user.repId, user.id] - show what that resolves to
    const lookupIds = [ld.user.rep_id, ld.user.repId, ld.user.id].filter(Boolean);
    console.log(`  Lookup IDs: ${JSON.stringify([...new Set(lookupIds)])}`);
  }
})();
