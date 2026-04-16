const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

const FILE = 'underwriting_corrections.json';

router.use(authMiddleware);

/**
 * Correction schema:
 * {
 *   id: string,
 *   clientId: string,
 *   docId?: string,
 *   transactionId?: string,
 *   field: string,
 *   originalValue: any,
 *   correctedValue: any,
 *   section: string,        // e.g. 'mca_transactions', 'true_credits', 'revenue_stats'
 *   reason?: string,
 *   userId: string,
 *   userName: string,
 *   timestamp: string,
 * }
 *
 * Future OCR training: export corrections grouped by field/section
 * to create labeled training pairs (original → corrected).
 */

// GET /api/corrections/:clientId — get all corrections for a client
router.get('/:clientId', async (req, res) => {
  try {
    const all = await loadFromS3(FILE);
    const forClient = all.filter(c => c.clientId === req.params.clientId);
    res.json(forClient);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/corrections — save a correction
router.post('/', async (req, res) => {
  try {
    const { clientId, docId, transactionId, field, originalValue, correctedValue, section, reason } = req.body;
    if (!clientId || !field) return res.status(400).json({ error: 'clientId and field required' });

    const correction = {
      id: `corr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      clientId, docId, transactionId, field,
      originalValue, correctedValue, section,
      reason: reason || '',
      userId: req.user.id,
      userName: req.user.full_name,
      timestamp: new Date().toISOString(),
    };

    const all = await loadFromS3(FILE);
    all.push(correction);
    await saveToS3(FILE, all);

    res.status(201).json(correction);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/corrections/export/training — export corrections for OCR training
// Future: use this to generate training pairs
router.get('/export/training', async (req, res) => {
  try {
    const all = await loadFromS3(FILE);
    // Group by section and field for training pipeline
    const grouped = {};
    for (const c of all) {
      const key = `${c.section}__${c.field}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ original: c.originalValue, corrected: c.correctedValue, context: c.transactionId || c.docId });
    }
    res.json({ totalCorrections: all.length, grouped });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
