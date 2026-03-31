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
  if (!['admin', 'rep', 'client'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, rep, or client' });
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
