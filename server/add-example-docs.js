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
  const login = await apiCall('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  const token = login.token;

  // Get all clients to find the example ones we just created
  const clients = await apiCall('GET', '/clients-api', null, token);
  const exampleClients = clients.filter(c => c.ownerName === 'Example Client');
  console.log('Found ' + exampleClients.length + ' Example Clients');

  for (const client of exampleClients) {
    // Check if already has bank statements
    const existingDocs = await apiCall('GET', '/documents/client/' + client.id, null, token);
    const bankDocs = existingDocs.filter ? existingDocs.filter(d => d.category === 'bank_statements') : [];
    if (bankDocs.length >= 3) {
      console.log(client.assignedRepName + ' -> already has ' + bankDocs.length + ' statements, skipping');
      continue;
    }

    // Use the confirm endpoint to register docs (they won't have real S3 files but will have financials)
    const statements = [
      { file: 'Bank_Statement_January_2025.pdf', rev: 45000, tag: 'jan' },
      { file: 'Bank_Statement_February_2025.pdf', rev: 52000, tag: 'feb' },
      { file: 'Bank_Statement_March_2025.pdf', rev: 48000, tag: 'mar' },
    ];

    for (const s of statements) {
      const key = 'clients/' + client.id + '/bank_statements/example_' + s.tag + '.pdf';
      const doc = await apiCall('POST', '/documents/confirm', {
        key,
        clientId: client.id,
        category: 'bank_statements',
        fileName: s.file,
        fileSize: '1.2 MB',
        uploadedBy: client.assignedRepId || 'admin-001',
      }, token);
      console.log(client.assignedRepName + ' -> ' + s.file + ': ' + (doc.doc ? 'OK' : doc.error || 'failed'));
    }
  }

  console.log('\nNow patching financials...');

  // Now patch the extractedFinancials directly since Textract won't find real files
  // We need to hit the docs endpoint to get IDs, then we can't patch directly...
  // Instead, let's just verify what we have
  for (const client of exampleClients) {
    const fin = await apiCall('GET', '/documents/financials/' + client.id, null, token);
    console.log(client.assignedRepName + ' -> available: ' + fin.available + ', avg: $' + (fin.avgMonthlyRevenue || 0));
  }

  console.log('\nDONE');
}

main().catch(e => console.error('FATAL:', e.message));
