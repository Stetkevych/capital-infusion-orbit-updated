const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

router.use(authMiddleware);

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// POST /api/notify/password-email — send a password notification email
router.post('/password-email', adminOnly, async (req, res) => {
  try {
    const { to, name, password } = req.body;
    if (!to || !password) return res.status(400).json({ error: 'to and password required' });

    await ses.send(new SendEmailCommand({
      Source: process.env.FROM_EMAIL || 'noreply@orbit-technology.com',
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: 'Your Orbit Login Credentials Have Been Updated' },
        Body: {
          Html: {
            Data: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <h2 style="color:#1e3a8a;">Capital Infusion Orbit</h2>
              <p>Hi ${name || 'there'},</p>
              <p>Your Orbit login credentials have been updated. Here are your new login details:</p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 8px;color:#64748b;font-size:13px;">Username (Email)</p>
                <p style="margin:0 0 16px;font-weight:bold;font-size:15px;">${to}</p>
                <p style="margin:0 0 8px;color:#64748b;font-size:13px;">New Password</p>
                <p style="margin:0;font-weight:bold;font-size:15px;font-family:monospace;background:#fff;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;">${password}</p>
              </div>
              <p>Log in at <a href="https://orbit-technology.com/login" style="color:#2563eb;">orbit-technology.com</a></p>
              <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Please change your password after logging in.</p>
            </div>`,
          },
        },
      },
    }));

    res.json({ ok: true });
  } catch (e) {
    console.error('[Notify] Email failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
