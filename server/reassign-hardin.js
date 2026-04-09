const API = 'https://api.orbit-technology.com/api';

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  const users = await (await fetch(`${API}/auth/users`, { headers })).json();

  const client = clients.find(c => (c.ownerName || '').toLowerCase().includes('james hardin'));
  const kip = (Array.isArray(users) ? users : []).find(u => u.full_name === 'Kip Langat');

  if (!client) { console.log('James Hardin not found'); return; }
  if (!kip) { console.log('Kip not found'); return; }

  await fetch(`${API}/clients-api/${client.id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ assignedRepId: kip.id, assignedRepName: kip.full_name }),
  });
  console.log(`James Hardin -> Kip Langat`);
})();
