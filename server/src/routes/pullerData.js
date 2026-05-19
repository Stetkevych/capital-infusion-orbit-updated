const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');
const axios = require('axios');

router.use(authMiddleware);

const FILE = 'puller_data.json';
const EXCLUDED_REPS = ['kip', 'jason kim'];

const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '1000.YHGKFX4WODRTUIW4UY9ESMXW5OMR4P';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || '5879634f9ce1f367cd59e58b4dc85cdaae01de7bb4';
const ZOHO_REFRESH_TOKEN = process.env.ZOHO_REFRESH_TOKEN || '1000.f84dd4ea17cf10b4b0ad7db68749fa66.c917e2772f721a60e4466c3acae7b2dc';
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

// GET /api/puller-data — fetch from S3 cache or Zoho
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

// GET /api/puller-data/sync — pull fresh from Zoho and cache
router.get('/sync', async (req, res) => {
  try {
    const token = await getZohoToken();
    const deals = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const r = await axios.get(`${ZOHO_API}/crm/v2/Deals`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
        params: { page, per_page: 200, fields: 'Deal_Name,Stage,Amount,Lead_Source,Owner,Closing_Date,Created_Time,Account_Name' },
      });
      const records = r.data?.data || [];
      records.forEach(d => {
        const stage = (d.Stage || '').toLowerCase();
        let status = 'pending';
        if (['closed won', 'funded', 'approved'].some(s => stage.includes(s))) status = 'approved';
        else if (['closed lost', 'declined', 'dead'].some(s => stage.includes(s))) status = 'declined';
        else if (stage.includes('default')) status = 'default';
        else if (stage.includes('fraud')) status = 'fraud';

        deals.push({
          id: d.id,
          company_name: d.Account_Name || d.Deal_Name || '',
          rep_name: d.Owner?.name || '',
          lead_source: d.Lead_Source || '',
          status,
          stage: d.Stage || '',
          amount: d.Amount || 0,
          date: d.Created_Time || d.Closing_Date || '',
        });
      });
      hasMore = r.data?.info?.more_records || false;
      page++;
    }

    await saveToS3(FILE, deals);
    const filtered = deals.filter(d => !EXCLUDED_REPS.some(ex => (d.rep_name || '').toLowerCase().includes(ex)));
    res.json({ synced: deals.length, displayed: filtered.length });
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
