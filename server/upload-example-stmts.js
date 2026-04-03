const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function apiCall(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const url = new URL('https://api.orbit-technology.com/api' + apiPath);
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

function uploadFile(filePath, fileName, clientId, uploadedBy, token) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    
    let body = '';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="clientId"\r\n\r\n' + clientId + '\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="category"\r\n\r\nbank_statements\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="uploadedBy"\r\n\r\n' + uploadedBy + '\r\n';
    body += '--' + boundary + '\r\n';
    body += 'Content-Disposition: form-data; name="files"; filename="' + fileName + '"\r\n';
    body += 'Content-Type: application/pdf\r\n\r\n';
    
    const bodyEnd = '\r\n--' + boundary + '--\r\n';
    
    const bodyStart = Buffer.from(body, 'utf8');
    const bodyEndBuf = Buffer.from(bodyEnd, 'utf8');
    const fullBody = Buffer.concat([bodyStart, fileData, bodyEndBuf]);

    const url = new URL('https://api.orbit-technology.com/api/documents/upload');
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': fullBody.length,
      },
    };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;

    const req = https.request(opts, (resp) => {
      let b = '';
      resp.on('data', (c) => (b += c));
      resp.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(b); } });
    });
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  const login = await apiCall('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  const token = login.token;
  console.log('Logged in');

  const clients = await apiCall('GET', '/clients-api', null, token);
  const exampleClients = clients.filter(c => c.ownerName === 'Example Client');
  console.log('Found ' + exampleClients.length + ' Example Clients\n');

  const stmtDir = 'C:\\Users\\Alex Stetkevych\\OneDrive - Capital Infusion\\Desktop';
  const files = [
    { path: path.join(stmtDir, 'Account Statement 1.pdf'), name: 'Bank_Statement_January_2025.pdf' },
    { path: path.join(stmtDir, 'Account Statement 2.pdf'), name: 'Bank_Statement_February_2025.pdf' },
    { path: path.join(stmtDir, 'Account Statement 3.pdf'), name: 'Bank_Statement_March_2025.pdf' },
  ];

  for (const client of exampleClients) {
    console.log('Processing: ' + (client.assignedRepName || 'Unknown') + ' (client ' + client.id + ')');
    for (const f of files) {
      if (!fs.existsSync(f.path)) { console.log('  FILE NOT FOUND: ' + f.path); continue; }
      const result = await uploadFile(f.path, f.name, client.id, client.assignedRepId || 'admin-001', token);
      console.log('  ' + f.name + ': ' + (result.uploaded ? 'OK (' + result.uploaded + ' uploaded)' : result.error || 'failed'));
    }
    console.log('');
  }

  // Wait for Textract
  console.log('Waiting 60s for Textract to process...');
  await new Promise(r => setTimeout(r, 60000));

  // Check results
  console.log('\nResults:');
  for (const client of exampleClients) {
    const fin = await apiCall('GET', '/documents/financials/' + client.id, null, token);
    console.log('  ' + (client.assignedRepName || '?') + ': $' + (fin.avgMonthlyRevenue || 0) + '/mo (' + (fin.monthsCovered || 0) + ' months, ' + fin.method + ')');
  }

  console.log('\nDONE');
}

main().catch(e => console.error('FATAL:', e.message));
