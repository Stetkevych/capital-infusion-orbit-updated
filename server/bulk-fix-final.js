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

  // Get all users to build rep name -> ID map
  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];
  const repByName = {};
  userArr.filter(u => u.is_active).forEach(u => { repByName[u.full_name] = u; });

  // Step 1: Fix Andy B back to rep role (he was upgraded to admin, which makes him see ALL clients)
  const andyB = userArr.find(u => u.full_name === 'Andy B');
  if (andyB && andyB.role === 'admin') {
    console.log('Fixing Andy B role back to rep...');
    await fetch(`${API}/auth/users/${andyB.id}`, { method: 'PATCH', headers, body: JSON.stringify({ role: 'rep' }) });
    console.log('Andy B -> rep');
  }

  // Step 2: Get all clients
  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  console.log(`\nTotal clients: ${clients.length}`);
  const onRepKip = clients.filter(c => c.assignedRepId === 'rep-kip');
  console.log(`On rep-kip: ${onRepKip.length}`);

  // Step 3: Apply ALL mappings, then PATCH each one with a 7s delay
  // But first, let's try a different approach: use the bulk approach through a single
  // temporary endpoint... Actually, the only way is one-at-a-time with delays.
  // The key insight: we need to wait for the S3 cache to expire (5s) between EACH write.
  
  const toFix = [];
  for (const c of clients) {
    const name = (c.ownerName || '').toLowerCase().trim();
    const repName = MAPPING[name];
    if (!repName) continue;
    const rep = repByName[repName];
    if (!rep) { console.log(`REP NOT FOUND: "${repName}"`); continue; }
    if (c.assignedRepId === rep.id) continue; // already correct
    toFix.push({ id: c.id, ownerName: c.ownerName, repId: rep.id, repName: rep.full_name });
  }
  
  console.log(`\n${toFix.length} clients need reassignment\n`);

  // Process ONE at a time with 8s delay, verify each one
  let fixed = 0, failed = 0;
  for (let i = 0; i < toFix.length; i++) {
    const { id, ownerName, repId, repName } = toFix[i];
    
    // PATCH
    await fetch(`${API}/clients-api/${id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ assignedRepId: repId, assignedRepName: repName }),
    });
    
    // Wait for S3 cache to expire
    await new Promise(r => setTimeout(r, 8000));
    
    // Verify
    const verify = await (await fetch(`${API}/clients-api/${id}`, { headers })).json();
    if (verify.assignedRepId === repId) {
      console.log(`[${i+1}/${toFix.length}] ✓ ${ownerName} -> ${repName}`);
      fixed++;
    } else {
      console.log(`[${i+1}/${toFix.length}] ✗ ${ownerName} -> FAILED (still ${verify.assignedRepId})`);
      failed++;
    }
    
    // Rate limit: pause every 10 to avoid 429
    if ((i + 1) % 10 === 0) {
      console.log(`  (pausing 30s for rate limit...)`);
      await new Promise(r => setTimeout(r, 30000));
    }
  }

  console.log(`\nDone: ${fixed} fixed, ${failed} failed`);
})();
