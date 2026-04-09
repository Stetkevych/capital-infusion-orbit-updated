const express = require('express');
const router = express.Router();
const ClientStore = require('../services/clientStore');
const { authMiddleware } = require('./auth');
const { sendDocumentRequestEmail } = require('../services/emailService');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const clients = user.role === 'admin'
      ? await ClientStore.getAll()
      : await ClientStore.getByRep([user.rep_id, user.repId, user.id].filter(Boolean));
    res.json(clients);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/deleted/all', async (req, res) => {
  try { res.json(await ClientStore.getDeleted()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const client = await ClientStore.getById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const user = req.user;
    if (user.role === 'client') return res.status(403).json({ error: 'Access denied' });
    const client = await ClientStore.create({
      ...req.body,
      assignedRepId: user.role === 'admin' ? (req.body.assignedRepId || user.id) : (user.rep_id || user.repId || user.id),
      assignedRepName: user.full_name,
    });
    res.status(201).json(client);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const client = await ClientStore.update(req.params.id, req.body);
    res.json(client);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const client = await ClientStore.softDelete(req.params.id);
    res.json({ message: 'Client moved to deleted', client });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/:id/restore', async (req, res) => {
  try {
    const client = await ClientStore.restore(req.params.id);
    res.json({ message: 'Client restored', client });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id/permanent', async (req, res) => {
  try {
    await ClientStore.permanentDelete(req.params.id);
    res.json({ message: 'Client permanently deleted' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ─── POST /api/clients-api/bulk-assign (admin only) ──────────────────────────
// Single S3 read → update all → single S3 write. No cache race conditions.
router.post('/bulk-assign', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { assignments } = req.body; // [{ clientId, assignedRepId, assignedRepName }]
    if (!Array.isArray(assignments) || !assignments.length) return res.status(400).json({ error: 'assignments array required' });
    const { loadFromS3, saveToS3 } = require('../services/s3Store');
    const clients = await loadFromS3('clients.json');
    let updated = 0;
    for (const a of assignments) {
      const idx = clients.findIndex(c => c.id === a.clientId);
      if (idx === -1) continue;
      clients[idx].assignedRepId = a.assignedRepId;
      clients[idx].assignedRepName = a.assignedRepName;
      clients[idx].updatedAt = new Date().toISOString();
      updated++;
    }
    await saveToS3('clients.json', clients);
    res.json({ updated, total: assignments.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/reminder', async (req, res) => {
  try {
    const client = await ClientStore.getById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const { category, categoryLabel, instructions, customMessage } = req.body;
    const user = req.user;
    await sendDocumentRequestEmail({
      clientEmail: client.email, clientName: client.ownerName, businessName: client.businessName,
      category: categoryLabel || category,
      instructions: customMessage || instructions || `Please upload your ${categoryLabel || category} at your earliest convenience.`,
      repName: user.full_name,
      portalUrl: process.env.FRONTEND_URL || 'https://orbit-technology.com',
    });
    res.json({ sent: true, to: client.email });
  } catch (err) {
    console.error('[Reminder] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
