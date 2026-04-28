const https = require('https');
const fs = require('fs');

const TOKEN = process.argv[2] || '';
if (!TOKEN) { console.log('Usage: node send-password-emails.js <auth-token>'); process.exit(1); }

const HOST = 'api.orbit-technology.com';
const log = fs.readFileSync('server/password-reset-log.txt', 'utf8');
const lines = log.split('\n').filter(l => l.includes(' | ') && !l.startsWith('FAILED') && !l.startsWith('PASSWORD'));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function sendEmail(to, name, password) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ to, name, password });
    const opts = {
      hostname: HOST, path: '/api/notify/password-email', method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN },
    };
    let d = '';
    const r = https.request(opts, res => {
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    r.write(body);
    r.end();
  });
}

async function run() {
  console.log(`Sending ${lines.length} password emails...\n`);
  let sent = 0, failed = 0;
  for (const line of lines) {
    const [name, email, pw] = line.split(' | ').map(s => s.trim());
    if (!email || !pw) continue;
    try {
      const result = await sendEmail(email, name, pw);
      if (result.status === 200) { console.log(`✓ ${email}`); sent++; }
      else { console.log(`✗ ${email} — ${result.body}`); failed++; }
    } catch (e) { console.log(`✗ ${email} — ${e.message}`); failed++; }
    await sleep(600);
  }
  console.log(`\nDone. ${sent} sent, ${failed} failed.`);
}

run().catch(e => console.error(e));
