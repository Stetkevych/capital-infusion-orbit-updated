const API = 'https://api.orbit-technology.com/api';

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  const match = clients.find(c =>
    (c.businessName || '').toLowerCase().includes('visionary') ||
    (c.ownerName || '').toLowerCase().includes('visionary')
  );

  if (!match) { console.log('Client not found'); return; }
  console.log(`Found: ${match.ownerName} / ${match.businessName} (${match.email}) - currently assigned to ${match.assignedRepId}`);

  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const dom = (Array.isArray(users) ? users : []).find(u => u.full_name === 'Dominic Basilio');
  if (!dom) { console.log('Dominic not found'); return; }

  await fetch(`${API}/clients-api/${match.id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ assignedRepId: dom.id, assignedRepName: dom.full_name }),
  });
  console.log(`Reassigned -> Dominic Basilio (${dom.id})`);
})();
