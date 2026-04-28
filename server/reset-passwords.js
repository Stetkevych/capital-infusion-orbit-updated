const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTAwMSIsImVtYWlsIjoiYWxleHNAY2FwaXRhbC1pbmZ1c2lvbi5jb20iLCJyb2xlIjoiYWRtaW4iLCJmdWxsX25hbWUiOiJBbGV4IFN0ZXRrZXZ5Y2giLCJyZXBfaWQiOm51bGwsImNsaWVudF9pZCI6bnVsbCwiaWF0IjoxNzc3MzgxNjMxLCJleHAiOjE3Nzc0NjgwMzF9.hjMnLfZkLjbtBF-5fK76yXUn079cpFeO0kWUrbBEkxc';
const HOST = 'api.orbit-technology.com';

function genPw() { return crypto.randomBytes(6).toString('base64url').slice(0, 10); }

function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    let d = '';
    const opts = { hostname: HOST, path, method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN } };
    const r = https.request(opts, res => {
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('Fetching users...');
  const users = await apiCall('GET', '/api/auth/users');
  if (!Array.isArray(users)) { console.log('Failed to fetch users:', users); return; }

  const internal = users.filter(u => u.role !== 'client' && u.is_active);
  console.log(`Found ${internal.length} internal accounts to reset.\n`);

  const log = [];

  for (const u of internal) {
    const pw = genPw();
    const result = await apiCall('PATCH', `/api/auth/users/${u.id}`, { password: pw });
    if (result.message === 'User updated') {
      log.push(`${u.full_name} | ${u.email} | ${pw}`);
      console.log(`✓ ${u.email} -> ${pw}`);
    } else {
      log.push(`FAILED: ${u.email} | ${JSON.stringify(result)}`);
      console.log(`✗ ${u.email} FAILED: ${JSON.stringify(result)}`);
    }
    await sleep(350);
  }

  fs.writeFileSync('server/password-reset-log.txt', `PASSWORD RESETS - ${new Date().toISOString()}\n\n${log.join('\n')}\n`);
  console.log(`\nDone. ${log.length} accounts processed. Log saved to server/password-reset-log.txt`);
  console.log('\nNow sending emails...\n');

  // Send emails via the forgot-password SES path (we'll hit a custom endpoint)
  // Since there's no bulk email endpoint, we'll use the existing SES setup through a direct call
  for (const line of log) {
    if (line.startsWith('FAILED')) continue;
    const [name, email, pw] = line.split(' | ');
    // Use forgot-password endpoint's SES config by calling it indirectly
    // Actually, let's just log — the admin can send from the console or we build a quick sender
    console.log(`EMAIL NEEDED: ${email} -> Password: ${pw}`);
  }

  console.log('\n--- EMAIL SENDING ---');
  console.log('Passwords have been reset. Email sending requires SES access from the server.');
  console.log('The log file has all new passwords. You can share individually or deploy an email sender.');
}

run().catch(e => console.error('Error:', e));
