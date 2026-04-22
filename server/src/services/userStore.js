const bcrypt = require('bcryptjs');
const { loadFromS3, saveToS3 } = require('./s3Store');

const FILE = 'users.json';

async function load() { return await loadFromS3(FILE); }
async function save(data) { await saveToS3(FILE, data); }

async function init() {
  const users = await load();
  let changed = false;

  if (users.length === 0) {
    const adminHash = bcrypt.hashSync('CapitalAdmin2024!', 10);
    users.push({
      id: 'admin-001',
      email: 'alexs@capital-infusion.com',
      full_name: 'Alex Stetkevych',
      role: 'admin',
      password_hash: adminHash,
      is_active: true,
      rep_id: null,
      client_id: null,
      created_at: new Date().toISOString(),
    });
    changed = true;
    console.log('[UserStore] Initialized with admin account: alexs@capital-infusion.com');
  }

  if (!users.find(u => u.email === 'jonathan@capital-infusion.com')) {
    users.push({
      id: 'admin-002',
      email: 'jonathan@capital-infusion.com',
      full_name: 'Jonathan',
      role: 'admin',
      password_hash: bcrypt.hashSync('Jonathan2026!', 10),
      is_active: true,
      rep_id: null,
      client_id: null,
      created_at: new Date().toISOString(),
    });
    changed = true;
    console.log('[UserStore] Added admin account: jonathan@capital-infusion.com');
  }

  const KIP_ID = 'rep-kip';
  if (!users.find(u => u.email === 'kip@capital-infusion.com')) {
    users.push({
      id: KIP_ID,
      email: 'kip@capital-infusion.com',
      full_name: 'Kip',
      role: 'rep',
      password_hash: bcrypt.hashSync('Kip2026!', 10),
      is_active: true,
      rep_id: KIP_ID,
      client_id: null,
      created_at: new Date().toISOString(),
    });
    changed = true;
    console.log('[UserStore] Added rep account: kip@capital-infusion.com');

  }

  if (!users.find(u => u.email === 'guillermo@capital-infusion.com')) {
    users.push({
      id: 'rep-guillermo',
      email: 'guillermo@capital-infusion.com',
      full_name: 'Guillermo',
      role: 'rep',
      password_hash: bcrypt.hashSync('Guillermo2026!', 10),
      is_active: true,
      rep_id: 'rep-guillermo',
      client_id: null,
      created_at: new Date().toISOString(),
    });
    changed = true;
    console.log('[UserStore] Added rep account: guillermo@capital-infusion.com');
  }

  if (!users.find(u => u.email === 'michael@capital-infusion.com')) {
    users.push({
      id: 'rep-michael',
      email: 'michael@capital-infusion.com',
      full_name: 'Michael',
      role: 'rep',
      password_hash: bcrypt.hashSync('Michael2026!', 10),
      is_active: true,
      rep_id: 'rep-michael',
      client_id: null,
      created_at: new Date().toISOString(),
    });
    changed = true;
    console.log('[UserStore] Added rep account: michael@capital-infusion.com');
  }

  if (changed) await save(users);
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
