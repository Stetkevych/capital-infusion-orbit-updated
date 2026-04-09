const API = 'https://api.orbit-technology.com/api';

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}` };

  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];
  const emilio = userArr.find(u => u.full_name?.toLowerCase().includes('emilio'));
  if (!emilio) { console.log('Emilio not found'); return; }
  console.log(`Emilio: id=${emilio.id} email=${emilio.email}`);

  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  const his = clients.filter(c => c.assignedRepId === emilio.id);
  console.log(`Clients assigned: ${his.length}`);
  his.forEach(c => console.log(`  ${c.ownerName || c.businessName} (${c.email}) - created ${c.createdAt}`));
})();
