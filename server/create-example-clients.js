const https = require('https');

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const url = new URL('https://api.orbit-technology.com/api' + path);
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = https.request(opts, (resp) => {
      let b = '';
      resp.on('data', (c) => (b += c));
      resp.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(b); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Login
  const login = await apiCall('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  const token = login.token;
  console.log('Logged in as admin');

  // Get users
  const users = await apiCall('GET', '/auth/users', null, token);
  console.log('Found ' + users.length + ' users');

  const reps = [
    { email: 'careem@capital-infusion.com', name: 'Careem Roberts' },
    { email: 'jamar@capital-infusion.com', name: 'Jamar' },
    { email: 'nikholas@capital-infusion.com', name: 'Nikholas Lazo' },
    { email: 'jonathanm@capital-infusion.com', name: 'Jonathan M' },
    { email: 'emilio@capital-infusion.com', name: 'Emilio' },
    { email: 'cipriani@capital-infusion.com', name: 'Cipriani' },
  ];

  const { loadFromS3, saveToS3 } = require('./src/services/s3Store');

  for (const rep of reps) {
    const user = users.find((u) => u.email.toLowerCase() === rep.email.toLowerCase());
    if (!user) { console.log('SKIP ' + rep.email + ' - not found'); continue; }

    // Create client
    const firstName = rep.name.split(' ')[0].toLowerCase();
    const client = await apiCall('POST', '/clients-api', {
      businessName: 'Example Client',
      ownerName: 'Example Client',
      email: 'example.' + firstName + '@demo.com',
      phone: '(555) 000-0000',
      industry: 'Demo',
      state: 'NY',
      assignedRepId: user.id,
      assignedRepName: rep.name,
      status: 'Active',
      source: 'manual',
    }, token);

    if (client.error) { console.log(rep.name + ' ERROR: ' + client.error); continue; }
    console.log(rep.name + ' -> Client ID: ' + client.id);

    // Add 3 bank statements
    const docs = await loadFromS3('documents.json');
    const statements = [
      { file: 'Bank_Statement_January_2025.pdf', rev: 45000, tag: 'jan' },
      { file: 'Bank_Statement_February_2025.pdf', rev: 52000, tag: 'feb' },
      { file: 'Bank_Statement_March_2025.pdf', rev: 48000, tag: 'mar' },
    ];

    for (const s of statements) {
      docs.push({
        id: 'doc_ex_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        key: 'clients/' + client.id + '/bank_statements/example_' + s.tag + '.pdf',
        clientId: client.id,
        category: 'bank_statements',
        fileName: s.file,
        fileSize: '1.2 MB',
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        status: 'Uploaded',
        visibility: 'all',
        tags: [],
        note: '',
        extractedFinancials: {
          success: true,
          jobId: 'example-' + s.tag,
          avgMonthlyRevenue: s.rev,
          estimatedAnnualRevenue: s.rev * 12,
          numberOfDeposits: 18 + Math.floor(Math.random() * 10),
          totalCredits: s.rev,
          negativeDays: Math.floor(Math.random() * 2),
          monthsCovered: 1,
          positions: [],
          positionCount: 0,
          totalLenderPayments: 0,
          withholdingRate: 0,
          method: 'summary',
          summaryHits: 1,
          extractedAt: new Date().toISOString(),
          confidence: 'high',
        },
        extractionStatus: 'complete',
      });
    }

    await saveToS3('documents.json', docs);
    console.log(rep.name + ' -> 3 bank statements added');
  }

  console.log('\nALL DONE');
}

main().catch((e) => console.error('FATAL:', e.message));
