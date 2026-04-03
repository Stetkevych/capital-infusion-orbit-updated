const https = require('https');
const fs = require('fs');
const path = require('path');

function apiCall(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const url = new URL('https://api.orbit-technology.com/api' + apiPath);
    const opts = { hostname: url.hostname, path: url.pathname, method, headers: { 'Content-Type': 'application/json' } };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = https.request(opts, (resp) => { let b = ''; resp.on('data', c => b += c); resp.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(b); } }); });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadFile(filePath, fileName, clientId, uploadedBy, token) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(filePath);
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const bodyStart = Buffer.from(
      '--' + boundary + '\r\nContent-Disposition: form-data; name="clientId"\r\n\r\n' + clientId + '\r\n' +
      '--' + boundary + '\r\nContent-Disposition: form-data; name="category"\r\n\r\nbank_statements\r\n' +
      '--' + boundary + '\r\nContent-Disposition: form-data; name="uploadedBy"\r\n\r\n' + uploadedBy + '\r\n' +
      '--' + boundary + '\r\nContent-Disposition: form-data; name="files"; filename="' + fileName + '"\r\nContent-Type: application/pdf\r\n\r\n', 'utf8');
    const bodyEnd = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf8');
    const fullBody = Buffer.concat([bodyStart, fileData, bodyEnd]);
    const url = new URL('https://api.orbit-technology.com/api/documents/upload');
    const opts = { hostname: url.hostname, path: url.pathname, method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'Content-Length': fullBody.length } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = https.request(opts, (resp) => { let b = ''; resp.on('data', c => b += c); resp.on('end', () => { try { resolve(JSON.parse(b)); } catch { resolve(b); } }); });
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  const login = await apiCall('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  const token = login.token;
  console.log('Logged in\n');

  const clients = await apiCall('GET', '/clients-api', null, token);
  const exampleClients = clients.filter(c => c.ownerName === 'Example Client');
  console.log('Found ' + exampleClients.length + ' Example Clients\n');

  const dir = 'C:\\Users\\Alex Stetkevych\\OneDrive - Capital Infusion\\Desktop';
  const files = [
    { path: path.join(dir, 'January_2026_Statement (1).pdf'), name: 'January_2026_Statement.pdf' },
    { path: path.join(dir, 'February_2026_Statement.pdf'), name: 'February_2026_Statement.pdf' },
    { path: path.join(dir, 'March_2026_Statement.pdf'), name: 'March_2026_Statement.pdf' },
  ];

  for (const f of files) {
    if (!fs.existsSync(f.path)) { console.log('FILE NOT FOUND: ' + f.path); return; }
  }

  for (const client of exampleClients) {
    const repName = client.assignedRepName || 'Unknown';
    console.log(repName + ' (' + client.id.slice(0, 8) + ')');
    for (const f of files) {
      const result = await uploadFile(f.path, f.name, client.id, client.assignedRepId || 'admin-001', token);
      console.log('  ' + f.name + ': ' + (result.uploaded ? 'OK' : result.error || 'failed'));
    }
    console.log('');
  }

  console.log('All uploads complete. Waiting 90s for Textract...\n');
  await new Promise(r => setTimeout(r, 90000));

  console.log('Results:');
  for (const client of exampleClients) {
    const fin = await apiCall('GET', '/documents/financials/' + client.id, null, token);
    console.log('  ' + (client.assignedRepName || '?') + ': $' + (fin.avgMonthlyRevenue || 0).toLocaleString() + '/mo | ' + (fin.monthsCovered || 0) + ' months | method: ' + (fin.method || '?'));
  }
  console.log('\nDONE');
}

main().catch(e => console.error('FATAL:', e.message));
