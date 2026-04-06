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
  // Keep last 1000 events
  if (logs.length > 1000) logs.length = 1000;
  await saveToS3(FILE, logs);
}

// GET /api/activity — get all activity
router.get('/', async (req, res) => {
  try {
    const logs = await loadFromS3(FILE);
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
