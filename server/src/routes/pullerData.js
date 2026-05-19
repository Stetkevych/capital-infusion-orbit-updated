const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');
const axios = require('axios');

router.use(authMiddleware);

const FILE = 'puller_data.json';
const EXCLUDED_REPS = ['kip langat', 'jason kim'];

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID_V2 || '1000.BHP4MQELZOMBZFOMA3TJVB4PI91MKW';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET_V2 || 'cd7810d0995afc1734da0a6f92b3a9b3d3431c5091';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN_V2 || '1000.afc12ed33e4ef50b030f1c995c81e63f.275ec885877dad6ca3d949b003263d50';
const ZOHO_API = 'https://www.zohoapis.com';

let zohoToken = { access_token: '', expires_at: 0 };

async function getZohoToken() {
  if (zohoToken.access_token && Date.now() < zohoToken.expires_at) return zohoToken.access_token;
  const params = new URLSearchParams({ grant_type: 'refresh_token', client_id: ZOHO_CLIENT_ID, client_secret: ZOHO_CLIENT_SECRET, refresh_token: ZOHO_REFRESH_TOKEN });
  const res = await axios.post('https://accounts.zoho.com/oauth/v2/token', params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (res.data.error) throw new Error(`Zoho auth: ${res.data.error}`);
  zohoToken = { access_token: res.data.access_token, expires_at: Date.now() + (res.data.expires_in - 120) * 1000 };
  return zohoToken.access_token;
}

function mapStage(stage) {
  if (!stage) return 'pending';
  const s = stage.toLowerCase();
  if (['funded', 'approved/qualified', 'approved - long close', 'contracts out', 'contracts in', 'future funding', 'funded-other', 'approved equipment &/or sba', 'requested contracts'].some(x => s.includes(x))) return 'approved';
  if (['deal declined', 'deal lost', 'dl - incomplete', 'dl - interested'].some(x => s === x)) return 'declined';
  if (s.includes('default') || s === 'dd - default') return 'default';
  if (s === 'fraud') return 'fraud';
  return 'pending';
}

// GET /api/puller-data
router.get('/', async (req, res) => {
  try {
    const deals = await loadFromS3(FILE).catch(() => []);
    const days = req.query.days;
    let filtered = deals.filter(d => {
      const repLower = (d.rep_name || '').toLowerCase();
      return !EXCLUDED_REPS.some(ex => repLower.includes(ex));
    });
    if (days && days !== 'all') {
      const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
      filtered = filtered.filter(d => d.date >= cutoff);
    }
    res.json({ deals: filtered });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/puller-data/sync — pull Waymo/Calendly from Leads + Accounts
router.get('/sync', async (req, res) => {
  try {
    const token = await getZohoToken();
    const deals = [];

    // Pull from Accounts (Pipeline) — Waymo flagged or Calendly disposition
    let page = 1, more = true;
    while (more && page <= 20) {
      const r = await axios.get(`${ZOHO_API}/crm/v2/Accounts`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params: { page, per_page: 200, fields: 'Stage_of_Package,Disposition,Puller,Lead_Source,Marketing_Master,Owner,Waymo,Amount,Created_Time,Business_Legal_Name' },
      });
      const records = r.data?.data || [];
      records.forEach(a => {
        const isWaymo = a.Waymo === true || (a.Lead_Source || '').toLowerCase().includes('waymo') || (a.Disposition || '').toLowerCase() === 'calendly';
        if (!isWaymo) return;
        // Exclude Calendly disposition (future appointments not yet occurred)
        const isCalendlyFuture = (a.Disposition || '').toLowerCase() === 'calendly';
        deals.push({
          id: a.id,
          company_name: a.Business_Legal_Name || '',
          rep_name: typeof a.Puller === 'string' ? a.Puller : (a.Owner?.name || ''),
          lead_source: a.Lead_Source || a.Marketing_Master || 'Waymo',
          status: mapStage(a.Stage_of_Package),
          stage: a.Stage_of_Package || '',
          disposition: a.Disposition || '',
          amount: a.Amount || 0,
          date: a.Created_Time || '',
          source_module: 'Accounts',
          is_future_appointment: isCalendlyFuture,
        });
      });
      more = r.data?.info?.more_records || false;
      page++;
    }

    // Pull from Leads — Waymo flagged
    page = 1; more = true;
    while (more && page <= 20) {
      const r = await axios.get(`${ZOHO_API}/crm/v2/Leads`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params: { page, per_page: 200, fields: 'Lead_Status,Lead_Source,Owner,Company,Created_Time,Waymo,First_Name,Last_Name' },
      });
      const records = r.data?.data || [];
      records.forEach(l => {
        const isWaymo = l.Waymo === true || (l.Lead_Source || '').toLowerCase().includes('waymo');
        if (!isWaymo) return;
        deals.push({
          id: l.id,
          company_name: l.Company || [l.First_Name, l.Last_Name].filter(Boolean).join(' ') || '',
          rep_name: l.Owner?.name || '',
          lead_source: l.Lead_Source || 'Waymo',
          status: 'pending',
          stage: l.Lead_Status || 'New Lead',
          disposition: '',
          amount: 0,
          date: l.Created_Time || '',
          source_module: 'Leads',
          is_future_appointment: false,
        });
      });
      more = r.data?.info?.more_records || false;
      page++;
    }

    await saveToS3(FILE, deals);
    const filtered = deals.filter(d => !EXCLUDED_REPS.some(ex => (d.rep_name || '').toLowerCase().includes(ex)));
    const excludingFuture = filtered.filter(d => !d.is_future_appointment);
    res.json({ synced: deals.length, displayed: excludingFuture.length, future_appointments: filtered.length - excludingFuture.length });
  } catch (e) {
    console.error('[PullerData Sync]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/puller-data — bulk import
router.post('/', async (req, res) => {
  try {
    const { deals } = req.body;
    if (!Array.isArray(deals)) return res.status(400).json({ error: 'deals array required' });
    await saveToS3(FILE, deals);
    res.json({ count: deals.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
