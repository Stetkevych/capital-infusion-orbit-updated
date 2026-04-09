const API = 'https://api.orbit-technology.com/api';

(async () => {
  for (const [name, email, pass] of [
    ['Cristian', 'cristian@capital-infusion.com', 'Cristian2026!'],
    ['Kip', 'kip@capital-infusion.com', 'Kip2026!'],
    ['Colin', 'colin@capital-infusion.com', 'Colin2026!'],
    ['Gimmy', 'gimmy@capital-infusion.com', 'Gimmy2026!'],
    ['Nikholas', 'nikholas@capital-infusion.com', 'Nikholas2026!'],
    ['Evan', 'evan@capital-infusion.com', 'Evan2026!'],
    ['Jeudy', 'jeudy@capital-infusion.com', 'Jeudy2026!'],
    ['Blake', 'blake@capital-infusion.com', 'Blake2026!'],
    ['Juan', 'juans@capital-infusion.com', 'Juan2026!'],
    ['Eduardo', 'eduardo@capital-infusion.com', 'Eduardo2026!'],
    ['Dominic', 'dominic@capital-infusion.com', 'Dominic2026!'],
    ['Joseph', 'joseph@capital-infusion.com', 'Joseph2026!'],
  ]) {
    const lr = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const ld = await lr.json();
    if (!lr.ok) { console.log(`${name}: LOGIN FAILED - ${ld.message}`); continue; }
    const cc = await (await fetch(`${API}/clients-api`, { headers: { Authorization: `Bearer ${ld.token}` } })).json();
    const arr = Array.isArray(cc) ? cc : [];
    console.log(`${name.padEnd(12)} -> ${arr.length} clients`);
  }
})();
