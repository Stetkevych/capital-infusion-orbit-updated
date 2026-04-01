const { v4: uuidv4 } = require('uuid');
const { loadFromS3, saveToS3 } = require('./s3Store');

const FILE = 'clients.json';

async function load() { return await loadFromS3(FILE); }
async function save(data) { await saveToS3(FILE, data); }

const ClientStore = {
  async getAll() { return (await load()).filter(c => !c.deleted); },
  async getDeleted() { return (await load()).filter(c => c.deleted); },
  async getByRep(repId) { return (await load()).filter(c => c.assignedRepId === repId && !c.deleted); },
  async getById(id) { return (await load()).find(c => c.id === id) || null; },
  async getByEmail(email) { return (await load()).find(c => c.email?.toLowerCase() === email?.toLowerCase()) || null; },

  async create(data) {
    const clients = await load();
    if (clients.find(c => c.email?.toLowerCase() === data.email?.toLowerCase() && !c.deleted)) {
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
      status: data.status || 'Pending',
      source: data.source || '',
      envelopeId: data.envelopeId || null,
      deleted: false,
      createdAt: new Date().toISOString(),
    };
    clients.push(client);
    await save(clients);
    return client;
  },

  async update(id, updates) {
    const clients = await load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    clients[idx] = { ...clients[idx], ...updates, updatedAt: new Date().toISOString() };
    await save(clients);
    return clients[idx];
  },

  async softDelete(id) {
    const clients = await load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    clients[idx].deleted = true;
    clients[idx].deletedAt = new Date().toISOString();
    await save(clients);
    return clients[idx];
  },

  async restore(id) {
    const clients = await load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    clients[idx].deleted = false;
    clients[idx].deletedAt = null;
    await save(clients);
    return clients[idx];
  },

  async permanentDelete(id) {
    const clients = await load();
    const idx = clients.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Client not found');
    clients.splice(idx, 1);
    await save(clients);
    return { deleted: true };
  },
};

module.exports = ClientStore;
