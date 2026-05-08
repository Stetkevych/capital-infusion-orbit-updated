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

    // Average login time-of-day
    const loginHours = clientLogins.map(a => new Date(a.timestamp || a.createdAt).getHours()).filter(h => !isNaN(h));
    const avgLoginHour = loginHours.length > 0 ? Math.round(loginHours.reduce((s, h) => s + h, 0) / loginHours.length) : null;

    // Average first login time (hours from account creation to first login)
    const firstLoginTimes = [];
    const loginsByUser = {};
    clientLogins.forEach(a => {
      const uid = a.clientId || a.userId;
      const ts = new Date(a.timestamp || a.createdAt).getTime();
      if (!loginsByUser[uid] || ts < loginsByUser[uid]) loginsByUser[uid] = ts;
    });
    clients.forEach(c => {
      const createdAt = new Date(c.created_at).getTime();
      const firstLogin = loginsByUser[c.client_id] || loginsByUser[c.id];
      if (firstLogin && createdAt && firstLogin > createdAt) {
        firstLoginTimes.push((firstLogin - createdAt) / 3600000); // hours
      }
    });
    const avgFirstLoginHours = firstLoginTimes.length > 0
      ? Math.round(firstLoginTimes.reduce((s, h) => s + h, 0) / firstLoginTimes.length * 10) / 10
      : null;

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
        avgLoginHour,
        avgFirstLoginHours,
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

// ─── GET /api/client-data/rep-metrics ─────────────────────────────────────────
router.get('/rep-metrics', adminOnly, async (req, res) => {
  try {
    const [clients, users, docs, activity, sessions] = await Promise.all([
      loadFromS3('clients.json'),
      loadFromS3('users.json'),
      loadFromS3('documents.json'),
      loadFromS3('activity_log.json'),
      loadFromS3('client_sessions.json'),
    ]);

    const repUsers = users.filter(u => (u.role === 'rep' || u.role === 'team_lead') && u.is_active);
    const activeClients = clients.filter(c => !c.deleted);
    const clientLogins = activity.filter(a => a.eventType === 'login');
    const sessionList = Array.isArray(sessions) ? sessions : [];

    const reps = repUsers.map(rep => {
      const repIds = [rep.id, rep.rep_id].filter(Boolean);
      const repClients = activeClients.filter(c => repIds.includes(c.assignedRepId));
      const repClientIds = new Set(repClients.map(c => c.id));
      const repClientEmails = new Set(repClients.map(c => c.email?.toLowerCase()).filter(Boolean));

      const clientUploads = docs.filter(d => repClientIds.has(d.clientId));
      const logins = clientLogins.filter(a => repClientIds.has(a.clientId) || repClientIds.has(a.userId));
      const clientSessions = sessionList.filter(s => repClientIds.has(s.clientId) || repClientIds.has(s.userId));
      const validSessions = clientSessions.filter(s => s.durationSec > 0);
      const avgSec = validSessions.length > 0
        ? Math.round(validSessions.reduce((sum, s) => sum + s.durationSec, 0) / validSessions.length)
        : 0;

      return {
        id: rep.id,
        name: rep.full_name,
        email: rep.email,
        clientCount: repClients.length,
        totalUploads: clientUploads.length,
        clientLogins: logins.length,
        avgClientSessionSec: avgSec,
      };
    }).filter(r => r.clientCount > 0);

    res.json({
      reps,
      totals: {
        totalReps: reps.length,
        totalClients: activeClients.length,
        totalUploads: docs.length,
        totalLogins: clientLogins.length,
      },
    });
  } catch (err) {
    console.error('[RepData] Error:', err.message);
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
