const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORE_PATH = path.join(__dirname, '../../data/clients.json');
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return []; }
}
function save(clients) { fs.writeFileSync(STORE_PATH, JSON.stringify(clients, null, 2)); }

const ClientStore = {
  getAll() { return load(); },
  getByRep(repId) { return load().filter(c => c.assignedRepId === repId); },
  getById(id) { return load().find(c => c.id === id) || null; },
  getByEmail(email) { return load().find(c => c.email?.toLowerCase() === email?.toLowerCase()) || null; },

  create(data) {
    const clients = load();
    if (clients.find(c => c.email?.toLowerCase() === data.email?.toLowerCase())) {
      throw new Error('A client with this email already exists');
    }
    const client = {
      id: uuidv4(),
      businessName: data.businessName,
      ownerName: data.ownerName,
      email: data.email,
      phone: data.phone || '',
      industry: data.industry || '',
      state: data.state || '',
      requestedAmount: parseFloat(data.requestedAmount) || 0,
      assignedRepId: data.assignedRepId,
      assignedRepName: data.assignedRepName || '',
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    save(clients);
    return client;
  },

  update(id, updates) {
    const clients = load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    clients[idx] = { ...clients[idx], ...updates, updatedAt: new Date().toISOString() };
    save(clients);
    return clients[idx];
  },
};

module.exports = ClientStore;
