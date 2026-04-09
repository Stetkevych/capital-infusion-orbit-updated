const API = 'https://api.orbit-technology.com/api';

const REPS = [
  ['Cristian', 'cristian@capital-infusion.com', 'Cristian2026!'],
  ['Kip', 'kip@capital-infusion.com', 'Kip2026!'],
  ['Colin', 'colin@capital-infusion.com', 'Colin2026!'],
  ['Nikholas', 'nikholas@capital-infusion.com', 'Nikholas2026!'],
  ['Evan', 'evan@capital-infusion.com', 'Evan2026!'],
  ['Jeudy', 'jeudy@capital-infusion.com', 'Jeudy2026!'],
  ['Blake', 'blake@capital-infusion.com', 'Blake2026!'],
  ['Juan', 'juans@capital-infusion.com', 'Juan2026!'],
  ['Dominic', 'dominic@capital-infusion.com', 'Dominic2026!'],
  ['Joseph', 'joseph@capital-infusion.com', 'Joseph2026!'],
  ['Jacob', 'jacob@capital-infusion.com', 'Jacob2026!'],
  ['Andy B', 'andyb@capital-infusion.com', 'Andy2026!'],
  ['Patrick', 'patrick@capital-infusion.com', 'Patrick2026!'],
  ['Rio', 'rio@capital-infusion.com', 'Rio2026!'],
  ['Gabriel S', 'gabriels@capital-infusion.com', 'Gabriel2026!'],
  ['Frank P', 'frankp@capital-infusion.com', 'Frank2026!'],
  ['Kevin McManus', 'kevinm@capital-infusion.com', 'Kevin2026!'],
  ['Kevin Cohen', 'kevinc@capital-infusion.com', 'Kevin2026!'],
  ['Erik Anderson', 'erik@capital-infusion.com', 'Erik2026!'],
  ['Ivan', 'ivan@capital-infusion.com', 'Ivan2026!'],
  ['Daniel P', 'danielp@capital-infusion.com', 'Daniel2026!'],
  ['Jonathan M', 'jonathanm@capital-infusion.com', 'Jonathan2026!'],
  ['Gimmy', 'gimmy@capital-infusion.com', 'Gimmy2026!'],
  ['Eduardo', 'eduardo@capital-infusion.com', 'Eduardo2026!'],
  ['Guillermo', 'guillermo@capital-infusion.com', 'Guillermo2026!'],
];

(async () => {
  // First get admin view of all clients
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}` };
  const allClients = await (await fetch(`${API}/clients-api`, { headers })).json();
  
  // Count still on rep-kip
  const onRepKip = allClients.filter(c => c.assignedRepId === 'rep-kip');
  console.log(`Total clients: ${allClients.length} | Still on rep-kip: ${onRepKip.length}\n`);

  // Test each rep login and what they see
  for (const [name, email, pass] of REPS) {
    const lr = await fetch(`${API}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const ld = await lr.json();
    if (!lr.ok) { console.log(`${name.padEnd(18)} LOGIN FAILED (${email})`); continue; }
    const cr = await (await fetch(`${API}/clients-api`, { headers: { Authorization: `Bearer ${ld.token}` } })).json();
    const arr = Array.isArray(cr) ? cr : [];
    const clientNames = arr.map(c => c.ownerName || c.businessName).join(', ');
    console.log(`${name.padEnd(18)} -> ${arr.length} clients${arr.length > 0 ? ': ' + clientNames : ''}`);
  }
})();
