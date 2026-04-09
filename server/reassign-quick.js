const API = 'https://api.orbit-technology.com/api';

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];

  const tasks = [
    { search: 'xram', repName: 'Colin' },
    { search: 'visionary', repName: 'Dominic Basilio' },
  ];

  for (const { search, repName } of tasks) {
    const client = clients.find(c =>
      (c.businessName || '').toLowerCase().includes(search) ||
      (c.ownerName || '').toLowerCase().includes(search)
    );
    if (!client) { console.log(`NOT FOUND: ${search}`); continue; }

    const rep = userArr.find(u => u.full_name === repName && u.is_active);
    if (!rep) { console.log(`REP NOT FOUND: ${repName}`); continue; }

    await fetch(`${API}/clients-api/${client.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ assignedRepId: rep.id, assignedRepName: rep.full_name }),
    });
    console.log(`${client.ownerName || client.businessName} -> ${rep.full_name}`);
  }
})();
