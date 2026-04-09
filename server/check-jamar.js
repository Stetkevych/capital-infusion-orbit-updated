const API = 'https://api.orbit-technology.com/api';
(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }) })).json();
  const headers = { Authorization: `Bearer ${token}` };
  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const jamar = (Array.isArray(users) ? users : []).find(u => u.full_name?.toLowerCase().includes('jamar'));
  if (!jamar) { console.log('Jamar not found'); return; }
  console.log(`Jamar: id=${jamar.id} email=${jamar.email}`);
  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  const his = clients.filter(c => c.assignedRepId === jamar.id);
  console.log(`Clients assigned: ${his.length}`);
  his.forEach(c => console.log(`  ${c.ownerName || c.businessName} (${c.email})`));
})();
