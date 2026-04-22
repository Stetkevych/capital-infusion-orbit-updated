const API = 'https://api.orbit-technology.com/api';

const PHONES = {
  'alejandro@capital-infusion.com': '(786) 706-4891',
  'alexs@capital-infusion.com': '(786) 206-4864',
  'andyb@capital-infusion.com': '(305) 395-3162',
  'andyr@capital-infusion.com': '(786) 741-2805',
  'anthonyd@capital-infusion.com': '(305) 390-4016',
  'blake@capital-infusion.com': '(954) 715-5058',
  'careem@capital-infusion.com': '(305) 239-8956',
  'christianp@capital-infusion.com': '(786) 299-5263',
  'christianq@capital-infusion.com': '(305) 433-4660',
  'colin@capital-infusion.com': '(786) 656-0781',
  'cristian@capital-infusion.com': '(786) 422-1407',
  'cristopher@capital-infusion.com': '(786) 522-6781',
  'danielp@capital-infusion.com': '(305) 489-9020',
  'dominic@capital-infusion.com': '(332) 456-3946',
  'dylan@capital-infusion.com': '(305) 395-5560',
  'eduardo@capital-infusion.com': '(786) 975-1002',
  'emilio@capital-infusion.com': '(954) 271-3171',
  'anderson@capital-infusion.com': '(786) 677-4343',
  'erik@capital-infusion.com': '(786) 677-4343',
  'evan@capital-infusion.com': '(786) 228-8927',
  'frankp@capital-infusion.com': '(305) 363-3848',
  'gabriels@capital-infusion.com': '(754) 315-5462',
  'gimmy@capital-infusion.com': '(786) 706-5604',
  'guillermo@capital-infusion.com': '(786) 398-5621',
  'ivan@capital-infusion.com': '(305) 901-2248',
  'jacob@capital-infusion.com': '(954) 727-3020',
  'jamar@capital-infusion.com': '(786) 374-2360',
  'jasmin@capital-infusion.com': '(786) 235-8615',
  'jasonm@capital-infusion.com': '(754) 315-1917',
  'jennifer@capital-infusion.com': '(786) 471-0810',
  'jonathanl@capital-infusion.com': '(786) 723-6016',
  'jonathanm@capital-infusion.com': '(305) 564-1217',
  'jonathano@capital-infusion.com': '(305) 433-4468',
  'joseph@capital-infusion.com': '(954) 369-1631',
  'juans@capital-infusion.com': '(754) 315-0814',
  'ken@capital-infusion.com': '(786) 706-0776',
  'kevinc@capital-infusion.com': '(305) 704-8327',
  'kevinm@capital-infusion.com': '(305) 380-2879',
  'kip@capital-infusion.com': '(954) 493-1223',
  'lydia@capital-infusion.com': '(332) 322-8098',
  'matthew@capital-infusion.com': '(305) 767-1961',
  'matthews@capital-infusion.com': '(646) 969-6993',
  'max@capital-infusion.com': '(786) 522-3962',
  'jeudy@capital-infusion.com': '(786) 206-4799',
  'michaelc@capital-infusion.com': '(305) 501-4559',
  'michaelm@capital-infusion.com': '(786) 723-6783',
  'nicholas@capital-infusion.com': '(469) 942-9026',
  'nikholas@capital-infusion.com': '(786) 522-3987',
  'noah@capital-infusion.com': '(786) 206-1795',
  'patrick@capital-infusion.com': '(646) 970-3096',
  'pat@capital-infusion.com': '(646) 970-3096',
  'ray@capital-infusion.com': '(860) 500-1558',
  'rio@capital-infusion.com': '(786) 206-7793',
  'santiago@capital-infusion.com': '(786) 539-3054',
};

(async () => {
  const { token } = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexs@capital-infusion.com', password: 'Programmer23!' }),
  })).json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const users = await (await fetch(`${API}/auth/users`, { headers })).json();
  let updated = 0, notFound = 0;

  for (const [email, phone] of Object.entries(PHONES)) {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Try partial match
      const partial = users.find(u => u.email.toLowerCase().includes(email.split('@')[0]));
      if (partial) {
        await fetch(`${API}/auth/users/${partial.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ phone }),
        });
        console.log(`${partial.full_name} (${partial.email}) -> ${phone}`);
        updated++;
      } else {
        notFound++;
      }
      continue;
    }
    await fetch(`${API}/auth/users/${user.id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ phone }),
    });
    console.log(`${user.full_name} (${user.email}) -> ${phone}`);
    updated++;
  }

  console.log(`\nDone: ${updated} updated, ${notFound} not found`);
})();
