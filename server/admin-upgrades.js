const API = 'https://api.orbit-technology.com/api';

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];

  // Upgrade Santiago to admin
  const santiago = userArr.find(u => u.full_name?.toLowerCase().includes('santiago'));
  if (santiago) {
    await fetch(`${API}/auth/users/${santiago.id}`, { method: 'PATCH', headers, body: JSON.stringify({ role: 'admin' }) });
    console.log(`Santiago (${santiago.email}) -> admin`);
  } else console.log('Santiago not found');

  // Upgrade Andy to admin - check which Andy (Andy B and Andy R exist)
  const andys = userArr.filter(u => u.full_name?.toLowerCase().startsWith('andy'));
  for (const a of andys) {
    await fetch(`${API}/auth/users/${a.id}`, { method: 'PATCH', headers, body: JSON.stringify({ role: 'admin' }) });
    console.log(`${a.full_name} (${a.email}) -> admin`);
  }

  // Create Chris admin account
  const existing = userArr.find(u => u.email === 'chris@capital-infusion.com');
  if (existing) {
    await fetch(`${API}/auth/users/${existing.id}`, { method: 'PATCH', headers, body: JSON.stringify({ role: 'admin', password: 'Chris2026!' }) });
    console.log(`Chris (existing) -> updated to admin`);
  } else {
    const res = await fetch(`${API}/auth/users`, {
      method: 'POST', headers,
      body: JSON.stringify({ email: 'chris@capital-infusion.com', full_name: 'Chris', role: 'admin', password: 'Chris2026!' }),
    });
    const data = await res.json();
    console.log(`Chris -> created as admin (${res.ok ? 'OK' : data.message})`);
  }

  // Verify all three
  for (const [email, pass] of [['chris@capital-infusion.com', 'Chris2026!']]) {
    const lr = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const ld = await lr.json();
    console.log(`\nChris login: ${lr.ok ? 'OK' : 'FAILED'} role=${ld.user?.role || 'n/a'}`);
  }
})();
