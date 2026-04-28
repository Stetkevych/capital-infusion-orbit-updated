const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

const FILE = 'funding_book.json';

router.use(authMiddleware);

// GET /api/funding-book — get entries for current user (admins see all)
router.get('/', async (req, res) => {
  try {
    const book = await loadFromS3(FILE).catch(() => []);
    const isAdmin = req.user?.role === 'admin';
    const filtered = isAdmin ? book : book.filter(e => e.rep_id === req.user.id || e.rep_email === req.user.email);
    res.json(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/funding-book — add entry
router.post('/', async (req, res) => {
  try {
    const book = await loadFromS3(FILE).catch(() => []);
    const entry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rep_id: req.user.id,
      rep_email: req.user.email,
      rep_name: req.user.full_name,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    book.push(entry);
    await saveToS3(FILE, book);
    res.json(entry);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/funding-book/:id — update entry (owner or admin)
router.patch('/:id', async (req, res) => {
  try {
    const book = await loadFromS3(FILE).catch(() => []);
    const idx = book.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && book[idx].rep_id !== req.user.id) return res.status(403).json({ error: 'Not yours' });
    const skip = new Set(['id', 'rep_id', 'rep_email', 'rep_name', 'created_at']);
    for (const [k, v] of Object.entries(req.body)) { if (!skip.has(k)) book[idx][k] = v; }
    book[idx].updated_at = new Date().toISOString();
    await saveToS3(FILE, book);
    res.json(book[idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/funding-book/:id
router.delete('/:id', async (req, res) => {
  try {
    const book = await loadFromS3(FILE).catch(() => []);
    const entry = book.find(e => e.id === req.params.id);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && entry.rep_id !== req.user.id) return res.status(403).json({ error: 'Not yours' });
    const filtered = book.filter(e => e.id !== req.params.id);
    await saveToS3(FILE, filtered);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
