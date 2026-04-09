const API = 'https://api.orbit-technology.com/api';

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];
  const chris = userArr.find(u => u.full_name === 'Christopher' && u.role === 'rep');
  if (!chris) { console.log('Christopher not found'); return; }

  console.log(`Found: ${chris.full_name} (${chris.email}) id=${chris.id}`);

  await fetch(`${API}/auth/users/${chris.id}`, {
    method: 'PATCH', headers,
    body: JSON.stringify({ email: 'cristopher@capital-infusion.com', password: 'Cristopher2026!' }),
  });
  console.log(`Updated -> cristopher@capital-infusion.com / Cristopher2026!`);

  // Verify login works
  const lr = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cristopher@capital-infusion.com', password: 'Cristopher2026!' }),
  });
  console.log(`Login test: ${lr.ok ? 'OK' : 'FAILED'}`);
})();
