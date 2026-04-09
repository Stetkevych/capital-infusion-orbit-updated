const API = 'https://api.orbit-technology.com/api';

// Mapping: client owner name (lowercase) -> rep name (must match full_name in users)
const MAPPING = {
  'jerome carter': 'Nikholas Lazo',
  'sandeep bhangu': 'Andy B',
  'ahmed alsherif': 'Dominic Basilio',
  'derek mullins': 'Nikholas Lazo',
  'michael lawless': 'Evan Kruer',
  'erik brent mathany': 'Jeudy',
  'mitchell ramirez': 'Jeudy',
  'isaac smith': 'Nikholas Lazo',
  'ronald morency': 'Dominic Basilio',
  'gregory rutland': 'Jonathan Montpeirous',
  'vinh huynh': 'Juan Saldarriaga',
  'frank sanders': 'Blake Fiorito',
  'shelley creel': 'Patrick',
  'bobby carver': 'Eduardo Z',
  'jorge alejandro cardenas': 'Cristian Piña',
  'christopher toombs': 'Kip Langat',
  'joe smith': 'Evan Kruer',
  'hiba owainat': 'Cristian Piña',
  'stephen allison': 'Rio',
  'theodore biniek': 'Jeudy',
  'rosa maria sabatela': 'Evan Kruer',
  'floyd saltzman, iii': 'Jacob',
  'gavon townsend': 'Eduardo Z',
  'robert l jackson': 'Blake Fiorito',
  'thomas e pugh': 'Gabriel S',
  'mark e smith': 'Gimmy Cipriani',
  'ayman odeh': 'Evan Kruer',
  'donald ttentham': 'Eduardo Z',
  'anthony nwokoagbara': 'Jacob',
  'jina cho': 'Dominic Basilio',
  'rodolfo y jerez mourin': 'Erik Anderson',
  'james hardin': 'Nikholas Lazo',
  'vadim shapiro': 'Juan Saldarriaga',
  'david tu': 'Nikholas Lazo',
  'antonio': 'Nikholas Lazo',
  'wilson rojas': 'Gimmy Cipriani',
  'ierusalema faupusa': 'Jeudy',
  'tameshwar narine': 'Kevin McManus',
  'luis antonio gomez': 'Gabriel S',
  'jonathan delagarza': 'Frank P',
  'london francois': 'Juan Saldarriaga',
  'gnel chibukhchyan': 'Gimmy Cipriani',
  'shante bazell': 'Gimmy Cipriani',
  'derek scott': 'Colin',
  'gabriel tanielian': 'Andy B',
  'shokouh moghimi': 'Evan Kruer',
  'olivia kitridge': 'Juan Saldarriaga',
  'simran suresh bellani': 'Jeudy',
  'manon verreau': 'Jeudy',
  'latoyia porter': 'Eduardo Z',
  'chienchang kuo': 'Frank P',
  'anthony sephus': 'Blake Fiorito',
  'robert kaialau iii': 'Blake Fiorito',
  'carlos m somarriba': 'Eduardo Z',
  'mike mitchell': 'Nikholas Lazo',
  'edward  leal': 'Dominic Basilio',
  'edward leal': 'Dominic Basilio',
  'stephane st hilaire': 'Nikholas Lazo',
  'emil petrosian': 'Jonathan Montpeirous',
  'gurmeet singh': 'Nikholas Lazo',
  'joankel garcia': 'Guillermo',
  'brandalyn kurtz': 'Gimmy Cipriani',
  'tylor  brown': 'Daniel P',
  'tylor brown': 'Daniel P',
  'billy alan gregory': 'Blake Fiorito',
  'lovepreet singh': 'Nikholas Lazo',
  'charles odhiambo': 'Jeudy',
  'lenny sierra': 'Joseph',
  'jerry sperling': 'Joseph',
  'fathi souissi': 'Frank P',
  'kushtrim plakaj': 'Andy B',
  'rodney shear': 'Gimmy Cipriani',
  'chidanand somaiah': 'Juan Saldarriaga',
  'chad nelson': 'Nikholas Lazo',
  'mark a lunski': 'Colin',
  'eman alhyari': 'Rio',
  'thomas warren': 'Juan Saldarriaga',
  'derek s. scott,l. md': 'Colin',
  'derek s. scott': 'Colin',
  'kiel jared': 'Gimmy Cipriani',
  'ryley mitchel ward': 'Kevin Cohen',
  'tajuddin mohammed': 'Dominic Basilio',
  'jeffrey p davis': 'Evan Kruer',
  'david daoust-kyle': 'Ivan',
  'gary okorn': 'Joseph',
  'carlos santizo': 'Jeudy',
  'norman wells': 'Evan Kruer',
  'eberval barros': 'Nikholas Lazo',
  'cesare gaetano': 'Dominic Basilio',
  'william cunningham': 'Evan Kruer',
  // reassign-clients.js mappings
  'pavlos andreopoulos': 'Nikholas Lazo',
  'david meinke': 'Juan Saldarriaga',
  'ayodele olatunji': 'Kip Langat',
  'garrett caplin': 'Colin',
  'saroop pahal': 'Joseph',
  'seth bogart': 'Jacob',
};

async function main() {
  // Login as admin
  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  });
  const { token } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Get all users to build rep name -> user ID map
  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  const userArr = Array.isArray(users) ? users : [];
  const repByName = {};
  userArr.filter(u => u.is_active).forEach(u => {
    repByName[u.full_name] = u;
  });

  console.log(`Loaded ${userArr.length} users\n`);

  // Get all clients
  const clients = await (await fetch(`${API}/clients-api`, { headers })).json();
  if (!Array.isArray(clients)) { console.log('ERROR: clients not array:', JSON.stringify(clients).slice(0, 300)); return; }
  console.log(`Loaded ${clients.length} clients\n`);

  let assigned = 0, skipped = 0, notMapped = 0, repNotFound = 0;
  const unmapped = [];

  for (const client of clients) {
    const name = (client.ownerName || '').toLowerCase().trim();
    const repName = MAPPING[name];

    if (!repName) {
      // Check if already correctly assigned (not rep-kip)
      if (client.assignedRepId && client.assignedRepId !== 'rep-kip') {
        skipped++;
        continue;
      }
      notMapped++;
      unmapped.push(`${client.ownerName || client.businessName} (${client.email}) -> assignedRepId=${client.assignedRepId}`);
      continue;
    }

    const rep = repByName[repName];
    if (!rep) {
      repNotFound++;
      console.log(`REP NOT FOUND: "${repName}" for client ${client.ownerName}`);
      continue;
    }

    // Check if already correctly assigned
    if (client.assignedRepId === rep.id) {
      skipped++;
      continue;
    }

    // Update
    try {
      await fetch(`${API}/clients-api/${client.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ assignedRepId: rep.id, assignedRepName: rep.full_name }),
      });
      console.log(`  ${client.ownerName || client.businessName} -> ${rep.full_name} (${rep.id})`);
      assigned++;
    } catch (e) {
      console.log(`  FAILED: ${client.ownerName} -> ${rep.full_name}: ${e.message}`);
    }

    // Small delay to avoid rate limiting
    if (assigned % 10 === 0) await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone: ${assigned} reassigned, ${skipped} already correct, ${notMapped} unmapped, ${repNotFound} reps not found`);
  if (unmapped.length) {
    console.log(`\n=== ${unmapped.length} UNMAPPED CLIENTS (still on old ID) ===`);
    unmapped.forEach(u => console.log(`  ${u}`));
  }
}

main().catch(e => console.error(e));
