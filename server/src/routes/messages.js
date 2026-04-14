const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

const FILE = 'messages.json';
async function loadMessages() { return await loadFromS3(FILE); }
async function saveMessages(msgs) { await saveToS3(FILE, msgs); }

router.use(authMiddleware);

// GET /api/messages?with=userId — get conversation with a specific user
router.get('/', async (req, res) => {
  try {
    const msgs = await loadMessages();
    const withUser = req.query.with;
    const myId = req.user.id;
    let filtered;
    if (withUser) {
      filtered = msgs.filter(m =>
        (m.fromId === myId && m.toId === withUser) || (m.fromId === withUser && m.toId === myId)
      );
    } else {
      filtered = msgs.filter(m => m.fromId === myId || m.toId === myId);
    }
    res.json(filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/messages/conversations — list unique conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const msgs = await loadMessages();
    const myId = req.user.id;
    const myMsgs = msgs.filter(m => m.fromId === myId || m.toId === myId);
    const convos = {};
    for (const m of myMsgs) {
      const otherId = m.fromId === myId ? m.toId : m.fromId;
      const otherName = m.fromId === myId ? m.toName : m.fromName;
      if (!convos[otherId] || new Date(m.timestamp) > new Date(convos[otherId].lastTimestamp)) {
        convos[otherId] = {
          userId: otherId,
          userName: otherName,
          lastMessage: m.text.slice(0, 80),
          lastTimestamp: m.timestamp,
          unread: myMsgs.filter(x => x.fromId === otherId && !x.read).length,
        };
      }
    }
    res.json(Object.values(convos).sort((a, b) => new Date(b.lastTimestamp) - new Date(a.lastTimestamp)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/messages — send a message
router.post('/', async (req, res) => {
  try {
    const { toId, toName, text } = req.body;
    if (!toId || !text) return res.status(400).json({ error: 'toId and text required' });

    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      fromId: req.user.id,
      fromName: req.user.full_name,
      fromRole: req.user.role,
      toId,
      toName: toName || '',
      text,
      read: false,
      timestamp: new Date().toISOString(),
    };

    const msgs = await loadMessages();
    msgs.push(msg);
    await saveMessages(msgs);

    // Email notification for rep<->client comms only (not internal)
    const senderRole = req.user.role;
    const UserStore = require('../services/userStore');
    const recipient = await UserStore.findById(toId);
    if (recipient) {
      const isRepToClient = (senderRole !== 'client' && recipient.role === 'client');
      const isClientToRep = (senderRole === 'client' && recipient.role !== 'client');
      if (isRepToClient || isClientToRep) {
        try {
          const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
          const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const FROM = process.env.FROM_EMAIL || 'noreply@orbit-technology.com';
          const PORTAL = process.env.FRONTEND_URL || 'https://orbit-technology.com';
          await ses.send(new SendEmailCommand({
            Source: `Capital Infusion <${FROM}>`,
            Destination: { ToAddresses: [recipient.email] },
            Message: {
              Subject: { Data: `New message from ${req.user.full_name}` },
              Body: {
                Html: { Data: `<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px"><h2 style="color:#1d1d1f">New Message</h2><p style="color:#424245"><strong>${req.user.full_name}</strong> sent you a message:</p><div style="background:#f5f5f7;border-radius:12px;padding:16px;margin:16px 0"><p style="color:#424245">${text}</p></div><p style="color:#424245"><a href="${PORTAL}">View in Orbit</a></p></div>` },
                Text: { Data: `${req.user.full_name}: ${text} — View at ${PORTAL}` },
              },
            },
          }));
        } catch (e) { console.error('[Messages] Email failed:', e.message); }
      }
    }

    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/messages/read — mark messages as read
router.patch('/read', async (req, res) => {
  try {
    const { fromId } = req.body;
    const msgs = await loadMessages();
    let count = 0;
    for (const m of msgs) {
      if (m.toId === req.user.id && m.fromId === fromId && !m.read) {
        m.read = true;
        count++;
      }
    }
    if (count > 0) await saveMessages(msgs);
    res.json({ marked: count });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
