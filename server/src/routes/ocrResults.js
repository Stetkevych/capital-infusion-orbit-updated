const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

router.use(authMiddleware);

const FILE = 'ocr_results.json';

// POST /api/ocr/results — save OCR results for a client
router.post('/results', async (req, res) => {
  try {
    const { clientId, results, analyzedAt } = req.body;
    if (!clientId || !results) return res.status(400).json({ error: 'clientId and results required' });
    const all = await loadFromS3(FILE).catch(() => []);
    all.unshift({ clientId, results, analyzedAt: analyzedAt || new Date().toISOString(), savedBy: req.user?.id });
    await saveToS3(FILE, all);
    res.json({ success: true, count: all.filter(r => r.clientId === clientId).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ocr/results/:clientId — get all OCR results for a client
router.get('/results/:clientId', async (req, res) => {
  try {
    const all = await loadFromS3(FILE).catch(() => []);
    res.json(all.filter(r => r.clientId === req.params.clientId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
