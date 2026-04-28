const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const CLIENT_ID = process.env.ZOHO_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '';
const REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '';
const API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

let accessToken = '';
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: REFRESH_TOKEN,
  });
  const res = await fetch(`https://accounts.zoho.com/oauth/v2/token?${params}`, { method: 'POST' });
  const data = await res.json();
  if (data.error) throw new Error(`Zoho auth: ${data.error}`);
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

async function zohoSearch(module, criteria) {
  const token = await getAccessToken();
  const res = await fetch(`${API_DOMAIN}/crm/v2/${module}/search?criteria=${encodeURIComponent(criteria)}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  if (res.status === 204) return [];
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}

// Deduplicate by id
function dedup(arr) {
  const seen = new Set();
  return arr.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
}

// POST /api/zoho-crm/check
router.post('/check', async (req, res) => {
  try {
    if (!REFRESH_TOKEN) return res.status(400).json({ error: 'Zoho CRM not configured' });
    const { name, email, company } = req.body;
    if (!name && !email && !company) return res.status(400).json({ error: 'name, email, or company required' });

    const results = { in_leads: false, in_contacts: false, in_deals: false, details: [] };
    const searches = [];

    // Email search — exact match, most reliable
    if (email) {
      searches.push(zohoSearch('Leads', `(Email:equals:${email})`).then(r => r.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, company: l.Company, status: l.Lead_Status, id: l.id }))));
      searches.push(zohoSearch('Contacts', `(Email:equals:${email})`).then(r => r.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, company: c.Account_Name, id: c.id }))));
    }

    // Name search — first + last for precision
    if (name) {
      const parts = name.trim().split(/\s+/);
      const firstName = parts[0];
      const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

      if (lastName) {
        // Search by last name + first name combo
        searches.push(zohoSearch('Leads', `((Last_Name:equals:${lastName})and(First_Name:equals:${firstName}))`).then(r => r.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, company: l.Company, status: l.Lead_Status, id: l.id, match: 'name' }))));
        searches.push(zohoSearch('Contacts', `((Last_Name:equals:${lastName})and(First_Name:equals:${firstName}))`).then(r => r.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, company: c.Account_Name, id: c.id, match: 'name' }))));
        // Also search last name only as fallback
        searches.push(zohoSearch('Leads', `(Last_Name:equals:${lastName})`).then(r => r.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, company: l.Company, status: l.Lead_Status, id: l.id, match: 'last_name' }))));
        searches.push(zohoSearch('Contacts', `(Last_Name:equals:${lastName})`).then(r => r.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, company: c.Account_Name, id: c.id, match: 'last_name' }))));
      } else {
        searches.push(zohoSearch('Leads', `(Last_Name:equals:${firstName})`).then(r => r.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, company: l.Company, status: l.Lead_Status, id: l.id, match: 'name' }))));
        searches.push(zohoSearch('Contacts', `(Last_Name:equals:${firstName})`).then(r => r.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, company: c.Account_Name, id: c.id, match: 'name' }))));
      }
    }

    // Company search — starts_with for partial match
    if (company) {
      const cleanCo = company.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      if (cleanCo.length >= 3) {
        searches.push(zohoSearch('Leads', `(Company:starts_with:${cleanCo})`).then(r => r.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, company: l.Company, status: l.Lead_Status, id: l.id, match: 'company' }))));
        searches.push(zohoSearch('Contacts', `(Account_Name:starts_with:${cleanCo})`).then(r => r.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, company: c.Account_Name, id: c.id, match: 'company' }))));
        // Also search Deals
        searches.push(zohoSearch('Deals', `(Deal_Name:starts_with:${cleanCo})`).then(r => r.map(d => ({ module: 'Deals', name: d.Deal_Name, amount: d.Amount, stage: d.Stage, id: d.id, match: 'company' }))).catch(() => []));
      }
    }

    const allResults = await Promise.all(searches.map(s => s.catch(() => [])));
    const flat = dedup(allResults.flat());

    for (const r of flat) {
      if (r.module === 'Leads') results.in_leads = true;
      if (r.module === 'Contacts') results.in_contacts = true;
      if (r.module === 'Deals') results.in_deals = true;
      results.details.push(r);
    }

    results.found = results.in_leads || results.in_contacts || results.in_deals;
    res.json(results);
  } catch (e) {
    console.error('[Zoho CRM Check]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
