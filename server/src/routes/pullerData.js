const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

router.use(authMiddleware);

const FILE = 'puller_data.json';

// GET /api/puller-data — fetch all deals with optional date filter
router.get('/', async (req, res) => {
  try {
    const deals = await loadFromS3(FILE).catch(() => []);
    const days = req.query.days;
    if (days && days !== 'all') {
      const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString();
      return res.json({ deals: deals.filter(d => d.date >= cutoff) });
    }
    res.json({ deals });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/puller-data — bulk import deals (from Zoho sync)
router.post('/', async (req, res) => {
  try {
    const { deals } = req.body;
    if (!Array.isArray(deals)) return res.status(400).json({ error: 'deals array required' });
    await saveToS3(FILE, deals);
    res.json({ count: deals.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/puller-data/append — add new deals without overwriting
router.post('/append', async (req, res) => {
  try {
    const { deals: newDeals } = req.body;
    if (!Array.isArray(newDeals)) return res.status(400).json({ error: 'deals array required' });
    const existing = await loadFromS3(FILE).catch(() => []);
    const existingIds = new Set(existing.map(d => d.id));
    const unique = newDeals.filter(d => !existingIds.has(d.id));
    const merged = [...unique, ...existing];
    await saveToS3(FILE, merged);
    res.json({ count: merged.length, added: unique.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
