const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const STORE_PATH = path.join(__dirname, '../../data/users.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Load users from file
function load() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
  } catch {}
  return [];
}

// Save users to file
function save(users) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(users, null, 2));
}

// Initialize with admin account if empty
function init() {
  const users = load();
  if (users.length === 0) {
    const adminHash = bcrypt.hashSync('CapitalAdmin2024!', 10);
    const admin = {
      id: 'admin-001',
      email: 'alexs@capital-infusion.com',
      full_name: 'Alex Stetkevych',
      role: 'admin',
      password_hash: adminHash,
      is_active: true,
      rep_id: null,
      client_id: null,
      created_at: new Date().toISOString(),
    };
    save([admin]);
    console.log('[UserStore] Initialized with admin account: alexs@capital-infusion.com');
  }
}

const UserStore = {
  init,

  findByEmail(email) {
    return load().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findById(id) {
    return load().find(u => u.id === id) || null;
  },

  findAll() {
    return load().map(({ password_hash, ...u }) => u);
  },

  findByRole(role) {
    return load().filter(u => u.role === role).map(({ password_hash, ...u }) => u);
  },

  create({ email, full_name, role, password, rep_id = null, client_id = null }) {
    const users = load();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User already exists');
    }
    const user = {
      id: `${role}-${Date.now()}`,
      email,
      full_name,
      role,
      password_hash: bcrypt.hashSync(password, 10),
      is_active: true,
      rep_id,
      client_id,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    save(users);
    const { password_hash, ...safe } = user;
    return safe;
  },

  update(id, updates) {
    const users = load();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    if (updates.password) {
      updates.password_hash = bcrypt.hashSync(updates.password, 10);
      delete updates.password;
    }
    users[idx] = { ...users[idx], ...updates, updated_at: new Date().toISOString() };
    save(users);
    const { password_hash, ...safe } = users[idx];
    return safe;
  },

  deactivate(id) {
    return this.update(id, { is_active: false });
  },

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },
};

module.exports = UserStore;
