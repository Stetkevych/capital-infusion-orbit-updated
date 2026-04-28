const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');

router.use(authMiddleware);

const ZB_KEY = process.env.ZEROBOUNCE_API_KEY || '';

router.post('/validate', async (req, res) => {
  try {
    if (!ZB_KEY) return res.status(400).json({ error: 'ZEROBOUNCE_API_KEY not configured' });
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });
    const url = `https://api.zerobounce.net/v2/validate?api_key=${ZB_KEY}&email=${encodeURIComponent(email)}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json({ status: data.status || 'unknown', sub_status: data.sub_status || '', valid: data.status === 'valid', email: data.address || email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
