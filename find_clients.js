const fs = require('fs');

// Check clients
const data = JSON.parse(fs.readFileSync('tmp_clients.json', 'utf8'));
const list = Array.isArray(data) ? data : data.clients || [];

// Check users
let users = [];
try { users = JSON.parse(fs.readFileSync('tmp_users.json', 'utf8')); } catch {}
if (!Array.isArray(users)) users = users.users || [];

const names = [
  'doyle knodel','olivia demarco','cielo gamarra','aleyiah haughton',
  'richard calderin','steven chatfield','matthew mejia','brandon gebauer',
  'artem smelov','kevin cohen','noah jones','michael magen',
  'alejandro manuel','jason mcgory','andrea sulca','vanessa fernandez',
  'gustavo prieto','mohammed bharoocha','pavan sai poluri','goldman'
];

console.log('--- CLIENTS ---');
const clientMatches = list.filter(c => {
  const fn = (c.full_name || '').toLowerCase();
  const bn = (c.business_name || '').toLowerCase();
  const on = (c.ownerName || '').toLowerCase();
  return names.some(n => fn.includes(n) || bn.includes(n) || on.includes(n));
});
clientMatches.forEach(m => console.log(`${m.id} | ${m.full_name || m.ownerName} | ${m.business_name || ''}`));
console.log(`Client matches: ${clientMatches.length}`);

console.log('\n--- USERS ---');
const userMatches = users.filter(u => {
  const fn = (u.full_name || '').toLowerCase();
  const em = (u.email || '').toLowerCase();
  return names.some(n => fn.includes(n) || em.includes(n.replace(' ', '')));
});
userMatches.forEach(m => console.log(`${m.id} | ${m.full_name} | ${m.email} | ${m.role}`));
console.log(`User matches: ${userMatches.length}`);
