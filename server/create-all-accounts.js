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

  // All accounts to create
  const accounts = [
    { email: 'gabriels@capital-infusion.com', name: 'Gabriel S', pw: 'Gabriel2026!' },
    { email: 'patrick@capital-infusion.com', name: 'Patrick', pw: 'Patrick2026!' },
    { email: 'eduardoz@capital-infusion.com', name: 'Eduardo Z', pw: 'Eduardo2026!' },
    { email: 'noah@capital-infusion.com', name: 'Noah', pw: 'Noah2026!' },
    { email: 'ray@capital-infusion.com', name: 'Ray', pw: 'Ray2026!' },
    { email: 'andyb@capital-infusion.com', name: 'Andy B', pw: 'Andy2026!' },
    { email: 'nicholas@capital-infusion.com', name: 'Nicholas', pw: 'Nicholas2026!' },
    { email: 'jacob@capital-infusion.com', name: 'Jacob', pw: 'Jacob2026!' },
    { email: 'ken@capital-infusion.com', name: 'Ken Pflug', pw: 'Ken2026!' },
    { email: 'jeudy@capital-infusion.com', name: 'Jeudy', pw: 'Jeudy2026!' },
    { email: 'anderson@capital-infusion.com', name: 'Erik Anderson', pw: 'Erik2026!' },
    { email: 'danielp@capital-infusion.com', name: 'Daniel P', pw: 'Daniel2026!' },
    { email: 'ivan@capital-infusion.com', name: 'Ivan', pw: 'Ivan2026!' },
    { email: 'blake@capital-infusion.com', name: 'Blake Fiorito', pw: 'Blake2026!' },
    { email: 'andyr@capital-infusion.com', name: 'Andy R', pw: 'Andy2026!' },
    { email: 'michaelm@capital-infusion.com', name: 'Michael M', pw: 'Michael2026!' },
    { email: 'rio@capital-infusion.com', name: 'Rio', pw: 'Rio2026!' },
    { email: 'frankp@capital-infusion.com', name: 'Frank P', pw: 'Frank2026!' },
    { email: 'christianq@capital-infusion.com', name: 'Christian Q', pw: 'Christian2026!' },
    { email: 'kcohen@capital-infusion.com', name: 'Kevin Cohen', pw: 'Kevin2026!' },
    { email: 'lydia@capital-infusion.com', name: 'Lydia', pw: 'Lydia2026!' },
    { email: 'marco@capital-infusion.com', name: 'Marco', pw: 'Marco2026!' },
    { email: 'santiago@capital-infusion.com', name: 'Santiago', pw: 'Santiago2026!' },
    { email: 'vittoria@capital-infusion.com', name: 'Vittoria', pw: 'Vittoria2026!' },
    { email: 'ruth@capital-infusion.com', name: 'Ruth', pw: 'Ruth2026!' },
    { email: 'jasonk@capital-infusion.com', name: 'Jason K', pw: 'Jason2026!' },
    { email: 'laurie@capital-infusion.com', name: 'Laurie', pw: 'Laurie2026!' },
    { email: 'jasmin@capital-infusion.com', name: 'Jasmin Meza', pw: 'Jasmin2026!' },
    { email: 'christopher@capital-infusion.com', name: 'Christopher', pw: 'Cristopher2026!' },
    { email: 'jennifer@capital-infusion.com', name: 'Jennifer', pw: 'Jennifer2026!' },
    { email: 'jonathan@capital-infusion.com', name: 'Jonathan', pw: 'Jonathan2026!' },
    { email: 'cipriani@capital-infusion.com', name: 'Gimmy Cipriani', pw: 'Gimmy2026!' },
    { email: 'joseph@capital-infusion.com', name: 'Joseph', pw: 'Joseph2026!' },
    { email: 'matthew@capital-infusion.com', name: 'Matthew', pw: 'Inc5000CEO!' },
  ];

  // Get existing users
  const existingUsers = await api('GET', '/auth/users', null, t);
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

  console.log('=== CREATING ACCOUNTS ===\n');
  let created = 0, skipped = 0;
  for (const a of accounts) {
    if (existingEmails.has(a.email.toLowerCase())) {
      // Update password for existing accounts
      const existing = existingUsers.find(u => u.email.toLowerCase() === a.email.toLowerCase());
      await api('PATCH', '/auth/users/' + existing.id, { password: a.pw }, t);
      console.log('EXISTS (pw updated) | ' + a.email + ' | ' + a.pw);
      skipped++;
    } else {
      const r = await api('POST', '/auth/users', { email: a.email, full_name: a.name, role: 'rep', password: a.pw }, t);
      if (r.user) {
        console.log('CREATED | ' + a.email + ' | ' + a.pw + ' | id: ' + r.user.id);
        created++;
      } else {
        console.log('ERROR | ' + a.email + ' | ' + (r.error || r.message));
      }
    }
  }
  console.log('\nCreated: ' + created + ' | Already existed: ' + skipped + '\n');

  // Now reassign clients based on DocuSign sender matching
  console.log('=== REASSIGNING CLIENTS ===\n');

  // Refresh user list
  const allUsers = await api('GET', '/auth/users', null, t);
  const allClients = await api('GET', '/clients-api', null, t);
  const allDocs = await api('GET', '/documents/client/all', null, t);

  // Build a map of envelope -> sender email from docs
  // DocuSign docs have assignedRepId set during poller, but some may be null
  // Check clients with null or mismatched assignedRepId
  let reassigned = 0;
  const unassigned = allClients.filter(c => !c.assignedRepId || c.assignedRepName === 'Unassigned');
  console.log('Unassigned clients: ' + unassigned.length);

  for (const client of unassigned) {
    // Find the docusign doc for this client to get the sender
    const clientDocs = allDocs.filter(d => d.clientId === client.id && d.uploadedBy === 'docusign');
    if (clientDocs.length === 0) continue;

    // The assignedRepId on the doc might have the original rep
    const docRepId = clientDocs[0].assignedRepId;
    if (docRepId) {
      const rep = allUsers.find(u => u.id === docRepId);
      if (rep) {
        await api('PATCH', '/clients-api/' + client.id, { assignedRepId: rep.id, assignedRepName: rep.full_name }, t);
        console.log('  ' + client.ownerName + ' -> ' + rep.full_name + ' (from doc rep)');
        reassigned++;
      }
    }
  }

  console.log('\nReassigned: ' + reassigned);
  console.log('\nDONE');
}

main().catch(e => console.error('FATAL:', e.message));
