const bcrypt = require('bcryptjs');
const { loadFromS3, saveToS3 } = require('./s3Store');

const FILE = 'users.json';

async function load() { return await loadFromS3(FILE); }
async function save(data) { await saveToS3(FILE, data); }

async function init() {
  const users = await load();
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
    await save([admin]);
    console.log('[UserStore] Initialized with admin account: alexs@capital-infusion.com');
  }
}

const UserStore = {
  init,

  async findByEmail(email) {
    return (await load()).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async findById(id) {
    return (await load()).find(u => u.id === id) || null;
  },

  async findAll() {
    return (await load()).map(({ password_hash, ...u }) => u);
  },

  async findByRole(role) {
    return (await load()).filter(u => u.role === role).map(({ password_hash, ...u }) => u);
  },

  async create({ email, full_name, role, password, rep_id = null, client_id = null, source = null, temp_password = null, business_name = null }) {
    const users = await load();
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
      source,
      temp_password,
      business_name,
      has_logged_in: false,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    await save(users);
    const { password_hash, ...safe } = user;
    return safe;
  },

  async update(id, updates) {
    const users = await load();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    if (updates.password) {
      updates.password_hash = bcrypt.hashSync(updates.password, 10);
      delete updates.password;
    }
    users[idx] = { ...users[idx], ...updates, updated_at: new Date().toISOString() };
    await save(users);
    const { password_hash, ...safe } = users[idx];
    return safe;
  },

  async deactivate(id) {
    return this.update(id, { is_active: false });
  },

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  },
};

module.exports = UserStore;
