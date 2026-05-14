const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const RR_KEY = process.env.ROCKETREACH_API_KEY || '1e7ced2k91ddcf7a0665cc3f075cdd330ce14938';
const BASE = 'https://api.rocketreach.co/api/v2';

// POST /api/rocketreach/lookup
router.post('/lookup', async (req, res) => {
  try {
    const { name, company, linkedin_url } = req.body;
    if (!name && !linkedin_url) return res.status(400).json({ error: 'name or linkedin_url required' });

    const params = new URLSearchParams();
    if (linkedin_url) params.append('linkedin_url', linkedin_url);
    if (name) params.append('name', name);
    if (company) params.append('current_employer', company);

    const response = await fetch(`${BASE}/lookupProfile?${params.toString()}`, {
      headers: { 'Api-Key': RR_KEY },
    });

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`RocketReach ${response.status}: ${err.slice(0, 300)}`);
    }

    const data = await response.json();
    res.json({
      name: data.name || data.first_name + ' ' + data.last_name,
      email: data.current_personal_email || data.current_work_email || (data.emails || [])[0]?.email || '',
      emails: (data.emails || []).map(e => ({ email: e.email, type: e.type })),
      phone: data.current_phone || (data.phones || [])[0]?.number || '',
      title: data.current_title || '',
      company: data.current_employer || '',
      linkedin_url: data.linkedin_url || '',
      location: data.location || '',
    });
  } catch (e) {
    console.error('[RocketReach]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rocketreach/search - Bulk search for people by title/location
router.post('/search', async (req, res) => {
  try {
    const { titles = ['Founder', 'Co-Founder'], page_size = 10 } = req.body;
    const response = await fetch(`${BASE}/search`, {
      method: 'POST',
      headers: { 'Api-Key': RR_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: { current_title: titles, location: ['United States'] },
        page_size: Math.min(page_size, 100),
      }),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`RocketReach ${response.status}: ${err.slice(0, 300)}`);
    }
    const data = await response.json();
    res.json({ profiles: data.profiles || [] });
  } catch (e) {
    console.error('[RocketReach Search]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
