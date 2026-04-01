const express = require('express');
const jwt = require('jsonwebtoken');
const UserStore = require('../services/userStore');
const EventLogger = require('../services/eventLogger');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'capital-infusion-secret-change-in-prod';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name, rep_id: user.rep_id, client_id: user.client_id },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only' });
  next();
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  const user = UserStore.findByEmail(email);
  if (!user || !user.is_active) return res.status(401).json({ message: 'Invalid credentials' });
  if (!UserStore.verifyPassword(user, password)) return res.status(401).json({ message: 'Invalid credentials' });

  const { password_hash, ...safe } = user;
  const token = generateToken(safe);
  EventLogger.login({ user_id: safe.id, email: safe.email, role: safe.role });
  res.json({ token, user: safe });
});

// ─── POST /api/auth/register (from DocuSign welcome email link) ───────────────
router.post('/register', (req, res) => {
  const { email, full_name, business_name, password } = req.body;
  if (!email || !full_name || !password) return res.status(400).json({ message: 'Missing required fields' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  try {
    // Link to existing client file if one was created by DocuSign webhook
    const ClientStore = require('../services/clientStore');
    const existingClient = ClientStore.getByEmail(email);
    const client_id = existingClient ? existingClient.id : `client-${Date.now()}`;

    const user = UserStore.create({
      email,
      full_name,
      role: 'client',
      password,
      client_id,
    });

    // Mark client file as having a portal login
    if (existingClient) {
      ClientStore.update(existingClient.id, { hasPortalLogin: true, portalUserId: user.id });
    }

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const user = UserStore.findByEmail(email);
  // Always return success to prevent email enumeration
  if (!user) return res.json({ sent: true });

  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpiry = Date.now() + 3600000; // 1 hour
  UserStore.update(user.id, { resetToken, resetExpiry });

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://orbit-technology.com';
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  try {
    const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
    const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
    await ses.send(new SendEmailCommand({
      Source: `Capital Infusion <${process.env.FROM_EMAIL || 'noreply@orbit-technology.com'}>`,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Reset Your Password' },
        Body: { Html: { Data: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>` } },
      },
    }));
  } catch (e) { console.error('[Auth] Reset email failed:', e.message); }

  res.json({ sent: true });
});

// ─── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) return res.status(400).json({ message: 'Missing fields' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const user = UserStore.findByEmail(email);
  if (!user || user.resetToken !== token || Date.now() > user.resetExpiry) {
    return res.status(400).json({ message: 'Invalid or expired reset link' });
  }

  UserStore.update(user.id, { password: newPassword, resetToken: null, resetExpiry: null });
  res.json({ message: 'Password reset successfully' });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  const user = UserStore.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const { password_hash, ...safe } = user;
  res.json(safe);
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'Invalid password input' });
  }
  const user = UserStore.findById(req.user.id);
  if (!UserStore.verifyPassword(user, currentPassword)) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }
  UserStore.update(req.user.id, { password: newPassword });
  res.json({ message: 'Password changed successfully' });
});

// ─── GET /api/auth/client-credentials (rep/admin only) ────────────────────────
router.get('/client-credentials', authMiddleware, (req, res) => {
  if (req.user.role === 'client') return res.status(403).json({ message: 'Access denied' });
  const allUsers = UserStore.findAll();
  const clientCreds = allUsers
    .filter(u => u.role === 'client' && u.source === 'docusign')
    .map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      business_name: u.business_name || '',
      temp_password: u.temp_password || null,
      has_logged_in: u.has_logged_in || false,
      created_at: u.created_at,
    }));
  res.json(clientCreds);
});

// ─── Admin: GET /api/auth/users ───────────────────────────────────────────────
router.get('/users', authMiddleware, adminOnly, (req, res) => {
  res.json(UserStore.findAll());
});

// ─── Admin: POST /api/auth/users (create employee/rep/client account) ─────────
router.post('/users', authMiddleware, adminOnly, (req, res) => {
  const { email, full_name, role, password, rep_id, client_id } = req.body;
  if (!email || !full_name || !role || !password) {
    return res.status(400).json({ message: 'email, full_name, role, and password are required' });
  }
  if (!['admin', 'rep', 'client', 'team_lead'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, team_lead, rep, or client' });
  }
  try {
    const user = UserStore.create({ email, full_name, role, password, rep_id, client_id });
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Admin: PATCH /api/auth/users/:id ────────────────────────────────────────
router.patch('/users/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const user = UserStore.update(req.params.id, req.body);
    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── Admin: DELETE /api/auth/users/:id (deactivate) ──────────────────────────
router.delete('/users/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    UserStore.deactivate(req.params.id);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
