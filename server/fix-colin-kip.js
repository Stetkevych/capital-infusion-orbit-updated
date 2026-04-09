const https = require('https');
function api(m, p, b, t) {
  return new Promise((r, j) => {
    const d = b ? JSON.stringify(b) : '';
    const u = new URL('https://api.orbit-technology.com/api' + p);
    const o = { hostname: u.hostname, path: u.pathname, method: m, headers: { 'Content-Type': 'application/json' } };
    if (d) o.headers['Content-Length'] = Buffer.byteLength(d);
    if (t) o.headers.Authorization = 'Bearer ' + t;
    const q = https.request(o, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { r(JSON.parse(b)); } catch { r(b); } }); });
    q.on('error', j); if (d) q.write(d); q.end();
  });
}

async function main() {
  const l = await api('POST', '/auth/login', { email: 'alexs@capital-infusion.com', password: 'CapitalAdmin2024!' });
  const t = l.token;
  console.log('Admin logged in\n');

  const users = await api('GET', '/auth/users', null, t);
  if (!Array.isArray(users)) { console.log('Users error:', JSON.stringify(users)); return; }

  const colin = users.find(u => u.email === 'colin@capital-infusion.com');
  const kip = users.find(u => u.email === 'kip@capital-infusion.com');

  console.log('Colin:', colin ? 'id:' + colin.id + ' active:' + colin.is_active : 'NOT FOUND');
  console.log('Kip:', kip ? 'id:' + kip.id + ' active:' + kip.is_active : 'NOT FOUND');

  // Reset passwords
  if (colin) await api('PATCH', '/auth/users/' + colin.id, { password: 'Colin2026!', is_active: true }, t);
  if (kip) await api('PATCH', '/auth/users/' + kip.id, { password: 'Kip2026!', is_active: true }, t);
  console.log('Passwords reset\n');

  // Test logins
  const c2 = await api('POST', '/auth/login', { email: 'colin@capital-infusion.com', password: 'Colin2026!' });
  console.log('Colin login:', c2.token ? 'OK | id: ' + c2.user.id : 'FAIL: ' + (c2.message || ''));

  const k2 = await api('POST', '/auth/login', { email: 'kip@capital-infusion.com', password: 'Kip2026!' });
  console.log('Kip login:', k2.token ? 'OK | id: ' + k2.user.id : 'FAIL: ' + (k2.message || ''));

  // Check clients
  const allClients = await api('GET', '/clients-api', null, t);

  if (colin) {
    const cc = allClients.filter(c => c.assignedRepId === colin.id);
    console.log('\nColin (' + colin.id + ') has ' + cc.length + ' clients:');
    cc.forEach(c => console.log('  ' + c.ownerName));
  }

  if (kip) {
    const kc = allClients.filter(c => c.assignedRepId === kip.id);
    console.log('\nKip (' + kip.id + ') has ' + kc.length + ' clients:');
    kc.forEach(c => console.log('  ' + c.ownerName));
  }

  // Now test what they actually see via API
  if (c2.token) {
    const seen = await api('GET', '/clients-api', null, c2.token);
    console.log('\nColin API returns:', Array.isArray(seen) ? seen.length + ' clients' : JSON.stringify(seen).slice(0, 100));
  }
  if (k2.token) {
    const seen = await api('GET', '/clients-api', null, k2.token);
    console.log('Kip API returns:', Array.isArray(seen) ? seen.length + ' clients' : JSON.stringify(seen).slice(0, 100));
  }
}

main().catch(e => console.error('FATAL:', e.message));
