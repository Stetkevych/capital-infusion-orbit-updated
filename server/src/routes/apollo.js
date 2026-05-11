const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const APOLLO_KEY = process.env.APOLLO_API_KEY || '';
const BASE = 'https://api.apollo.io';

async function apolloPost(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': APOLLO_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Apollo ${res.status}: ${err.slice(0, 300)}`);
  }
  return res.json();
}

// POST /api/apollo/search
router.post('/search', async (req, res) => {
  try {
    if (!APOLLO_KEY) return res.status(400).json({ error: 'APOLLO_API_KEY not configured on server' });
    const { page, per_page, person_titles, person_locations, organization_num_employees_ranges, q_keywords, person_seniorities } = req.body;
    const data = await apolloPost('/v1/mixed_people/api_search', {
      page: page || 1,
      per_page: per_page || 25,
      person_titles: person_titles || [],
      person_locations: person_locations || [],
      organization_num_employees_ranges: organization_num_employees_ranges || [],
      q_keywords: q_keywords || '',
      person_seniorities: person_seniorities || [],
    });
    res.json(data);
  } catch (e) {
    console.error('[Apollo Search]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/apollo/enrich
router.post('/enrich', async (req, res) => {
  try {
    if (!APOLLO_KEY) return res.status(400).json({ error: 'APOLLO_API_KEY not configured on server' });
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const data = await apolloPost('/v1/people/match', { id, reveal_personal_emails: false });
    res.json(data);
  } catch (e) {
    console.error('[Apollo Enrich]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/apollo/enriched-leads — save enriched lead to server
router.post('/enriched-leads', async (req, res) => {
  try {
    const { loadFromS3, saveToS3 } = require('../services/s3Store');
    const leads = await loadFromS3('enriched_leads.json').catch(() => []);
    const lead = req.body;
    if (!lead || !lead.id) return res.status(400).json({ error: 'lead with id required' });
    const idx = leads.findIndex(l => l.id === lead.id);
    if (idx >= 0) leads[idx] = { ...leads[idx], ...lead };
    else leads.unshift(lead);
    await saveToS3('enriched_leads.json', leads);
    res.json({ count: leads.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/apollo/enriched-leads — get all enriched leads
router.get('/enriched-leads', async (req, res) => {
  try {
    const { loadFromS3 } = require('../services/s3Store');
    const leads = await loadFromS3('enriched_leads.json').catch(() => []);
    res.json(leads);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/apollo/enriched-leads/count — just the count
router.get('/enriched-leads/count', async (req, res) => {
  try {
    const { loadFromS3 } = require('../services/s3Store');
    const leads = await loadFromS3('enriched_leads.json').catch(() => []);
    res.json({ count: leads.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
