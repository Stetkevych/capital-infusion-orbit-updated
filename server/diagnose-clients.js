const API = 'https://api.orbit-technology.com/api';

(async () => {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  });
  const { token } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  // Admin sees all clients
  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  if (!Array.isArray(clients)) { console.log('Clients not array:', JSON.stringify(clients).slice(0,300)); return; }

  // Get all users
  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];

  // Group clients by assignedRepId
  const byRep = {};
  clients.forEach(c => { const k = c.assignedRepId || 'NONE'; (byRep[k] = byRep[k] || []).push(c); });

  console.log(`Total clients: ${clients.length}\n`);
  console.log('=== CLIENTS GROUPED BY assignedRepId ===\n');
  for (const [repId, cls] of Object.entries(byRep).sort((a,b) => b[1].length - a[1].length)) {
    const matchedUser = userArr.find(u => u.id === repId || u.rep_id === repId);
    const label = matchedUser ? `${matchedUser.full_name} (${matchedUser.email})` : 'NO MATCHING USER';
    console.log(`"${repId}" -> ${cls.length} clients | ${label}`);
    cls.slice(0, 3).forEach(c => console.log(`    ${c.ownerName || c.businessName} (${c.email})`));
    if (cls.length > 3) console.log(`    ...+${cls.length - 3} more`);
  }
})();
