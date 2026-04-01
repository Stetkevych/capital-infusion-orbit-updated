const express = require('express');
const router = express.Router();
const ClientStore = require('../services/clientStore');
const { authMiddleware } = require('./auth');
const { sendDocumentRequestEmail } = require('../services/emailService');

router.use(authMiddleware);

// GET /api/clients
router.get('/', (req, res) => {
  try {
    const user = req.user;
    const clients = user.role === 'admin'
      ? ClientStore.getAll()
      : ClientStore.getByRep(user.rep_id || user.repId || user.id);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id
router.get('/:id', (req, res) => {
  try {
    const client = ClientStore.getById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients
router.post('/', (req, res) => {
  try {
    const user = req.user;
    if (user.role === 'client') return res.status(403).json({ error: 'Access denied' });
    const client = ClientStore.create({
      ...req.body,
      assignedRepId: user.role === 'admin' ? (req.body.assignedRepId || user.id) : (user.rep_id || user.repId || user.id),
      assignedRepName: user.full_name,
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/clients/:id
router.patch('/:id', (req, res) => {
  try {
    const client = ClientStore.update(req.params.id, req.body);
    res.json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const client = ClientStore.softDelete(req.params.id);
    res.json({ message: 'Client moved to deleted', client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/clients/:id/restore
router.post('/:id/restore', (req, res) => {
  try {
    const client = ClientStore.restore(req.params.id);
    res.json({ message: 'Client restored', client });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/clients/:id/permanent
router.delete('/:id/permanent', (req, res) => {
  try {
    ClientStore.permanentDelete(req.params.id);
    res.json({ message: 'Client permanently deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/clients/deleted
router.get('/deleted/all', (req, res) => {
  try {
    res.json(ClientStore.getDeleted());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/:id/reminder — send document reminder email
router.post('/:id/reminder', async (req, res) => {
  try {
    const client = ClientStore.getById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const { category, categoryLabel, instructions, customMessage } = req.body;
    const user = req.user;

    await sendDocumentRequestEmail({
      clientEmail: client.email,
      clientName: client.ownerName,
      businessName: client.businessName,
      category: categoryLabel || category,
      instructions: customMessage || instructions || `Please upload your ${categoryLabel || category} at your earliest convenience.`,
      repName: user.full_name,
      portalUrl: process.env.FRONTEND_URL || 'https://main.d2iq2t6ose4q0u.amplifyapp.com',
    });

    res.json({ sent: true, to: client.email });
  } catch (err) {
    console.error('[Reminder] Failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
