const express = require('express');
const router = express.Router();
const ClientStore = require('../services/clientStore');
const { authMiddleware } = require('./auth');
const { sendDocumentRequestEmail } = require('../services/emailService');

router.use(authMiddleware);

// Team lead -> member email mapping (team leads see their members' clients)
const TEAM_MEMBERS = {
  'ray@capital-infusion.com': ['jamar@capital-infusion.com','pat@capital-infusion.com','kevin@capital-infusion.com','eduardo@capital-infusion.com','jacob@capital-infusion.com'],
  'anthony@capital-infusion.com': ['nikholas@capital-infusion.com','dominic@capital-infusion.com','kevinc@capital-infusion.com','michaelm@capital-infusion.com'],
  'ivan@capital-infusion.com': ['evan@capital-infusion.com','danielp@capital-infusion.com','juans@capital-infusion.com','frankp@capital-infusion.com','gimmy@capital-infusion.com'],
  'erik@capital-infusion.com': ['jeudy@capital-infusion.com','gabriels@capital-infusion.com','dominic@capital-infusion.com'],
};

router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 0;
    let clients;

    if (user.role === 'admin') {
      clients = await ClientStore.getAll();
    } else {
      const teamMemberEmails = TEAM_MEMBERS[user.email?.toLowerCase()];
      if (teamMemberEmails) {
        const UserStore = require('../services/userStore');
        const memberIds = [];
        for (const email of teamMemberEmails) {
          const member = await UserStore.findByEmail(email);
          if (member) memberIds.push(member.id, member.rep_id, member.repId);
        }
        const allIds = [user.rep_id, user.repId, user.id, ...memberIds].filter(Boolean);
        clients = await ClientStore.getByRep([...new Set(allIds)]);
      } else {
        clients = await ClientStore.getByRep([user.rep_id, user.repId, user.id].filter(Boolean));
      }
    }

    // Pagination — if page/limit provided, slice results
    if (limit > 0) {
      const start = (page > 0 ? page - 1 : 0) * limit;
      return res.json({ total: clients.length, page: page || 1, limit, data: clients.slice(start, start + limit) });
    }
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
