const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const RR_KEY = process.env.ROCKETREACH_API_KEY || '1e7ced2k0aaad4e6e1bc6436e76d188e5a4cf69d';
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

module.exports = router;
