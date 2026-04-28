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
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Zoho ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data || [];
}

// POST /api/zoho-crm/check — check if a name/email exists in Leads, Contacts, or Deals
router.post('/check', async (req, res) => {
  try {
    if (!REFRESH_TOKEN) return res.status(400).json({ error: 'Zoho CRM not configured' });
    const { name, email, company } = req.body;
    if (!name && !email && !company) return res.status(400).json({ error: 'name, email, or company required' });

    const results = { in_leads: false, in_contacts: false, in_deals: false, details: [] };

    if (email) {
      const [leads, contacts] = await Promise.all([
        zohoSearch('Leads', `(Email:equals:${email})`).catch(() => []),
        zohoSearch('Contacts', `(Email:equals:${email})`).catch(() => []),
      ]);
      if (leads.length) { results.in_leads = true; results.details.push(...leads.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, status: l.Lead_Status, id: l.id }))); }
      if (contacts.length) { results.in_contacts = true; results.details.push(...contacts.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, id: c.id }))); }
    }

    if (name && !results.in_leads && !results.in_contacts) {
      const nameParts = name.trim().split(/\s+/);
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : name;
      const [leads, contacts] = await Promise.all([
        zohoSearch('Leads', `(Last_Name:equals:${lastName})`).catch(() => []),
        zohoSearch('Contacts', `(Last_Name:equals:${lastName})`).catch(() => []),
      ]);
      if (leads.length) { results.in_leads = true; results.details.push(...leads.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, status: l.Lead_Status, id: l.id }))); }
      if (contacts.length) { results.in_contacts = true; results.details.push(...contacts.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, id: c.id }))); }
    }

    if (!results.in_leads && !results.in_contacts && company) {
      const [leads, contacts] = await Promise.all([
        zohoSearch('Leads', `(Company:equals:${company})`).catch(() => []),
        zohoSearch('Contacts', `(Account_Name:equals:${company})`).catch(() => []),
      ]);
      if (leads.length) { results.in_leads = true; results.details.push(...leads.map(l => ({ module: 'Leads', name: l.Full_Name, email: l.Email, company: l.Company, id: l.id }))); }
      if (contacts.length) { results.in_contacts = true; results.details.push(...contacts.map(c => ({ module: 'Contacts', name: c.Full_Name, email: c.Email, id: c.id }))); }
    }

    results.found = results.in_leads || results.in_contacts || results.in_deals;
    res.json(results);
  } catch (e) {
    console.error('[Zoho CRM Check]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
