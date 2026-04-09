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
  const l = await api('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  const t = l.token;
  console.log('Logged in\n');

  // Get all users and clients
  const users = await api('GET', '/auth/users', null, t);
  const clients = await api('GET', '/clients-api', null, t);

  // First, create Kip account if not exists
  const kip = users.find(u => u.email && u.email.toLowerCase().includes('kip@'));
  if (!kip) {
    const k = await api('POST', '/auth/users', { email: 'kip@capital-infusion.com', full_name: 'Kip Langat', role: 'rep', password: 'Kip2026!' }, t);
    console.log('Kip account:', k.user ? 'CREATED' : k.error || k.message);
  } else {
    console.log('Kip account: EXISTS');
  }

  // Refresh users
  const allUsers = await api('GET', '/auth/users', null, t);

  // Helper to find user by name fragment
  function findRep(name) {
    const lower = name.toLowerCase();
    return allUsers.find(u => u.full_name && u.full_name.toLowerCase().includes(lower));
  }

  // Helper to find client by email
  function findClient(email) {
    const lower = email.toLowerCase();
    return clients.find(c => c.email && c.email.toLowerCase() === lower);
  }

  // Assignments: client email -> rep name
  const assignments = [
    { clientEmail: 'pavlos.cmp@gmail.com', repName: 'Nikholas' },
    { clientEmail: 'meinkeagency@live.com', repName: 'Juan' },
    { clientEmail: 'ayo.olatunji@acepointe.com', repName: 'Kip' },
    { clientEmail: 'gcaplin@caplincapitalmanagement.com', repName: 'Colin' },
    { clientEmail: 'info@ambcartage.ca', repName: 'Joseph' },
    { clientEmail: 'sethbogart@ymail.com', repName: 'Jacob' },
    { clientEmail: 'johnson_maureen@att.net', repName: 'Cristian' },
    { clientEmail: 'ramji@ramaexpress.net', repName: 'Guillermo' },
  ];

  console.log('\n=== REASSIGNING CLIENTS ===\n');

  for (const a of assignments) {
    const client = findClient(a.clientEmail);
    if (!client) {
      // Try case-insensitive partial match
      const partial = clients.find(c => c.email && c.email.toLowerCase().includes(a.clientEmail.toLowerCase().split('@')[0]));
      if (partial) {
        console.log('  Partial match: ' + partial.email + ' for ' + a.clientEmail);
      } else {
        console.log('  CLIENT NOT FOUND: ' + a.clientEmail);
        continue;
      }
    }

    const rep = findRep(a.repName);
    if (!rep) {
      console.log('  REP NOT FOUND: ' + a.repName);
      continue;
    }

    const c = client || clients.find(cl => cl.email && cl.email.toLowerCase().includes(a.clientEmail.toLowerCase().split('@')[0]));
    const r = await api('PATCH', '/clients-api/' + c.id, { assignedRepId: rep.id, assignedRepName: rep.full_name }, t);
    console.log('  ' + (r.ownerName || r.businessName) + ' -> ' + rep.full_name + ' (' + rep.email + ')');
  }

  console.log('\nDONE');
}

main().catch(e => console.error('FATAL:', e.message));
