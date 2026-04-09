const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

router.use(authMiddleware);

// Admin only
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ─── GET /api/client-data/metrics ─────────────────────────────────────────────
// Read-only aggregation of existing data
router.get('/metrics', adminOnly, async (req, res) => {
  try {
    const [docs, users, activity, sessions] = await Promise.all([
      loadFromS3('documents.json'),
      loadFromS3('users.json'),
      loadFromS3('activity_log.json'),
      loadFromS3('client_sessions.json'),
    ]);

    const clients = users.filter(u => u.role === 'client' && u.is_active);
    const totalClients = clients.length;

    // Upload metrics from documents.json
    const clientUploads = {};
    for (const doc of docs) {
      if (!doc.clientId) continue;
      if (!clientUploads[doc.clientId]) clientUploads[doc.clientId] = { count: 0, categories: new Set() };
      clientUploads[doc.clientId].count++;
      clientUploads[doc.clientId].categories.add(doc.category);
    }

    const clientsWhoUploaded = Object.keys(clientUploads).length;
    const clientsWithMultiple = Object.values(clientUploads).filter(u => u.count >= 2).length;
    const totalUploads = docs.length;
    const avgUploadsPerClient = clientsWhoUploaded > 0 ? (totalUploads / clientsWhoUploaded).toFixed(1) : 0;

    // Category breakdown
    const byCat = {};
    for (const doc of docs) {
      const cat = doc.category || 'unknown';
      byCat[cat] = (byCat[cat] || 0) + 1;
    }

    // Upload timeline (last 30 days)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const recentUploads = docs.filter(d => new Date(d.uploadedAt).getTime() > thirtyDaysAgo);
    const uploadsByDay = {};
    for (const doc of recentUploads) {
      const day = doc.uploadedAt?.slice(0, 10);
      if (day) uploadsByDay[day] = (uploadsByDay[day] || 0) + 1;
    }

    // Login metrics from activity_log.json
    const clientLogins = activity.filter(a => a.eventType === 'login');
    const uniqueLoggedIn = new Set(clientLogins.map(a => a.clientId || a.userId)).size;
    const recentLogins = clientLogins.filter(a => new Date(a.timestamp || a.createdAt).getTime() > thirtyDaysAgo);

    // Session duration from client_sessions.json
    const sessionList = Array.isArray(sessions) ? sessions : [];
    const validSessions = sessionList.filter(s => s.durationSec > 0);
    const avgSessionSec = validSessions.length > 0
      ? Math.round(validSessions.reduce((sum, s) => sum + s.durationSec, 0) / validSessions.length)
      : 0;
    const maxSessionSec = validSessions.length > 0 ? Math.max(...validSessions.map(s => s.durationSec)) : 0;

    // Per-client detail
    const clientDetails = clients.map(c => {
      const uploads = clientUploads[c.client_id] || { count: 0, categories: new Set() };
      const logins = clientLogins.filter(a => (a.clientId || a.userId) === c.client_id).length;
      const userSessions = sessionList.filter(s => s.userId === c.id || s.clientId === c.client_id);
      const avgDur = userSessions.length > 0
        ? Math.round(userSessions.reduce((s, x) => s + (x.durationSec || 0), 0) / userSessions.length)
        : 0;
      return {
        id: c.id,
        clientId: c.client_id,
        name: c.full_name,
        email: c.email,
        uploads: uploads.count,
        categories: [...(uploads.categories || [])],
        logins,
        avgSessionSec: avgDur,
        lastActivity: null,
      };
    }).sort((a, b) => b.uploads - a.uploads);

    res.json({
      summary: {
        totalClients,
        clientsWhoUploaded,
        clientsWithMultiple,
        uploadRate: totalClients > 0 ? ((clientsWhoUploaded / totalClients) * 100).toFixed(1) : 0,
        multiUploadRate: totalClients > 0 ? ((clientsWithMultiple / totalClients) * 100).toFixed(1) : 0,
        totalUploads,
        avgUploadsPerClient: parseFloat(avgUploadsPerClient),
        uniqueLoggedIn,
        recentLogins30d: recentLogins.length,
        avgSessionSec,
        maxSessionSec,
      },
      uploadsByCategory: byCat,
      uploadsByDay,
      clientDetails,
    });
  } catch (err) {
    console.error('[ClientData] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/client-data/session ────────────────────────────────────────────
// Called by frontend beacon on page unload to record session duration
router.post('/session', async (req, res) => {
  try {
    const { durationSec } = req.body;
    if (!durationSec || durationSec < 1) return res.json({ ok: true });
    const sessions = await loadFromS3('client_sessions.json');
    sessions.push({
      userId: req.user.id,
      clientId: req.user.client_id,
      role: req.user.role,
      durationSec: Math.round(durationSec),
      timestamp: new Date().toISOString(),
    });
    // Keep last 10000 sessions max
    if (sessions.length > 10000) sessions.splice(0, sessions.length - 10000);
    await saveToS3('client_sessions.json', sessions);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true }); // Never fail the beacon
  }
});

module.exports = router;
