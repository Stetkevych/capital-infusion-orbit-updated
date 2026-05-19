const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

const API_KEY = process.env.ORBIT_API_KEY || 'orbit-api-k_9f3d7a2b1c8e4f6d0a5b7c9e2f4a6d8b';
const FILE = 'ocr_results.json';

// Middleware: accept JWT OR API key
function authOrApiKey(req, res, next) {
  // Check for API key in header or body
  const key = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '') || req.body?.api_key;
  if (key === API_KEY) {
    req.user = { id: 'api-key', role: 'system' };
    return next();
  }
  // Fall back to JWT auth
  return authMiddleware(req, res, next);
}

// POST /api/ocr/results — save OCR results for a client (accepts API key OR JWT)
router.post('/results', authOrApiKey, async (req, res) => {
  try {
    const { clientId, client_id, results, analyzedAt } = req.body;
    const cid = clientId || client_id;
    if (!cid || !results) return res.status(400).json({ error: 'clientId and results required' });
    const all = await loadFromS3(FILE).catch(() => []);
    all.unshift({ clientId: cid, results, analyzedAt: analyzedAt || new Date().toISOString(), savedBy: req.user?.id });
    await saveToS3(FILE, all);
    res.json({ success: true, count: all.filter(r => r.clientId === cid).length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/ocr/results/:clientId — get all OCR results for a client (requires JWT)
router.get('/results/:clientId', authMiddleware, async (req, res) => {
  try {
    const all = await loadFromS3(FILE).catch(() => []);
    res.json(all.filter(r => r.clientId === req.params.clientId));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
