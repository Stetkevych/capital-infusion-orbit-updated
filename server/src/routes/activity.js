const express = require('express');
const router = express.Router();
const { loadFromS3, saveToS3 } = require('../services/s3Store');

const FILE = 'activity_log.json';

async function logActivity(event) {
  const logs = await loadFromS3(FILE);
  logs.unshift({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...event,
    timestamp: new Date().toISOString(),
  });
  // Keep last 10000 events
  if (logs.length > 10000) logs.length = 10000;
  await saveToS3(FILE, logs);
}

// GET /api/activity — get all activity
router.get('/', async (req, res) => {
  try {
    const logs = await loadFromS3(FILE);
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;
    if (limit > 0) {
      const start = (page > 0 ? page - 1 : 0) * limit;
      return res.json({ total: logs.length, page: page || 1, limit, data: logs.slice(start, start + limit) });
    }
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/activity — log an event
router.post('/', async (req, res) => {
  try {
    await logActivity(req.body);
    res.json({ logged: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/activity/cleanup — remove non-client activity
router.post('/cleanup', async (req, res) => {
  try {
    const logs = await loadFromS3(FILE);
    const cleaned = logs.filter(a => !a.userRole || a.userRole === 'client');
    await saveToS3(FILE, cleaned);
    res.json({ before: logs.length, after: cleaned.length, removed: logs.length - cleaned.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
module.exports.logActivity = logActivity;
