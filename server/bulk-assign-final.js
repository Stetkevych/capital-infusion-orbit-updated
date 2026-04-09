const API = 'https://api.orbit-technology.com/api';

const MAPPING = {
  'jerome carter': 'Nikholas Lazo', 'sandeep bhangu': 'Andy B', 'ahmed alsherif': 'Dominic Basilio',
  'derek mullins': 'Nikholas Lazo', 'michael lawless': 'Evan Kruer', 'erik brent mathany': 'Jeudy',
  'mitchell ramirez': 'Jeudy', 'isaac smith': 'Nikholas Lazo', 'ronald morency': 'Dominic Basilio',
  'gregory rutland': 'Jonathan Montpeirous', 'vinh huynh': 'Juan Saldarriaga', 'frank sanders': 'Blake Fiorito',
  'shelley creel': 'Patrick', 'bobby carver': 'Eduardo Z', 'jorge alejandro cardenas': 'Cristian Piña',
  'christopher toombs': 'Kip Langat', 'joe smith': 'Evan Kruer', 'hiba owainat': 'Cristian Piña',
  'stephen allison': 'Rio', 'theodore biniek': 'Jeudy', 'rosa maria sabatela': 'Evan Kruer',
  'floyd saltzman, iii': 'Jacob', 'gavon townsend': 'Eduardo Z', 'robert l jackson': 'Blake Fiorito',
  'thomas e pugh': 'Gabriel S', 'mark e smith': 'Gimmy Cipriani', 'ayman odeh': 'Evan Kruer',
  'donald ttentham': 'Eduardo Z', 'anthony nwokoagbara': 'Jacob', 'jina cho': 'Dominic Basilio',
  'rodolfo y jerez mourin': 'Erik Anderson', 'james hardin': 'Kip Langat', 'vadim shapiro': 'Juan Saldarriaga',
  'david tu': 'Nikholas Lazo', 'antonio': 'Nikholas Lazo', 'wilson rojas': 'Gimmy Cipriani',
  'ierusalema faupusa': 'Jeudy', 'tameshwar narine': 'Kevin McManus', 'luis antonio gomez': 'Gabriel S',
  'jonathan delagarza': 'Frank P', 'london francois': 'Juan Saldarriaga', 'gnel chibukhchyan': 'Gimmy Cipriani',
  'shante bazell': 'Gimmy Cipriani', 'derek scott': 'Colin', 'gabriel tanielian': 'Andy B',
  'shokouh moghimi': 'Evan Kruer', 'olivia kitridge': 'Juan Saldarriaga', 'simran suresh bellani': 'Jeudy',
  'manon verreau': 'Jeudy', 'latoyia porter': 'Eduardo Z', 'chienchang kuo': 'Frank P',
  'anthony sephus': 'Blake Fiorito', 'robert kaialau iii': 'Blake Fiorito', 'carlos m somarriba': 'Eduardo Z',
  'mike mitchell': 'Nikholas Lazo', 'edward  leal': 'Dominic Basilio', 'edward leal': 'Dominic Basilio',
  'stephane st hilaire': 'Nikholas Lazo', 'emil petrosian': 'Jonathan Montpeirous',
  'gurmeet singh': 'Nikholas Lazo', 'joankel garcia': 'Guillermo', 'brandalyn kurtz': 'Gimmy Cipriani',
  'tylor  brown': 'Daniel P', 'tylor brown': 'Daniel P', 'billy alan gregory': 'Blake Fiorito',
  'lovepreet singh': 'Nikholas Lazo', 'charles odhiambo': 'Jeudy', 'lenny sierra': 'Joseph',
  'jerry sperling': 'Joseph', 'fathi souissi': 'Frank P', 'kushtrim plakaj': 'Andy B',
  'rodney shear': 'Gimmy Cipriani', 'chidanand somaiah': 'Juan Saldarriaga', 'chad nelson': 'Nikholas Lazo',
  'mark a lunski': 'Colin', 'eman alhyari': 'Rio', 'thomas warren': 'Juan Saldarriaga',
  'derek s. scott,l. md': 'Colin', 'derek s. scott': 'Colin', 'kiel jared': 'Gimmy Cipriani',
  'ryley mitchel ward': 'Kevin Cohen', 'tajuddin mohammed': 'Dominic Basilio', 'jeffrey p davis': 'Evan Kruer',
  'david daoust-kyle': 'Ivan', 'gary okorn': 'Joseph', 'carlos santizo': 'Jeudy',
  'norman wells': 'Evan Kruer', 'eberval barros': 'Nikholas Lazo', 'cesare gaetano': 'Dominic Basilio',
  'william cunningham': 'Evan Kruer', 'pavlos andreopoulos': 'Nikholas Lazo',
  'david meinke': 'Juan Saldarriaga', 'ayodele olatunji': 'Kip Langat', 'garrett caplin': 'Colin',
  'saroop pahal': 'Joseph', 'seth bogart': 'Jacob',
  'scott marx': 'Colin', 'lucindra w crutcher': 'Dominic Basilio',
  'alex punsalan': 'Guillermo', 'ram kaushik': 'Guillermo',
};

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];
  const repByName = {};
  userArr.filter(u => u.is_active).forEach(u => { repByName[u.full_name] = u; });

  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  console.log(`${clients.length} clients loaded`);

  const assignments = [];
  for (const c of clients) {
    const name = (c.ownerName || '').toLowerCase().trim();
    const repName = MAPPING[name];
    if (!repName) continue;
    const rep = repByName[repName];
    if (!rep) { console.log(`REP NOT FOUND: "${repName}"`); continue; }
    assignments.push({ clientId: c.id, assignedRepId: rep.id, assignedRepName: rep.full_name });
  }

  console.log(`${assignments.length} assignments to make\n`);

  const res = await fetch(`${API}/clients-api/bulk-assign`, {
    method: 'POST', headers,
    body: JSON.stringify({ assignments }),
  });
  const data = await res.json();
  console.log(`Result: ${res.status}`, JSON.stringify(data));

  if (!res.ok) {
    console.log('\nv75 bulk-assign not available yet. Waiting...');
    return;
  }

  // Verify a few key reps
  console.log('\n=== VERIFICATION ===\n');
  for (const [name, email, pass] of [
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
  ]) {
    const lr = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
    const ld = await lr.json();
    if (!lr.ok) { console.log(`${name.padEnd(12)} LOGIN FAILED`); continue; }
    const cc = await (await fetch(`${API}/clients-api`, { headers: { Authorization: `Bearer ${ld.token}` } })).json();
    const arr = Array.isArray(cc) ? cc : [];
    console.log(`${name.padEnd(12)} -> ${arr.length} clients`);
  }
})();
