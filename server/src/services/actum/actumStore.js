/**
 * Actum Transaction Store
 * S3-backed persistence for LOC payments, Actum transactions, and postback events.
 */

const { v4: uuidv4 } = require('uuid');
const { loadFromS3, saveToS3 } = require('../s3Store');
const { maskAccount, maskRouting } = require('./actumMapper');

const TX_FILE = 'actum_transactions.json';
const EVENT_FILE = 'actum_events.json';
const POSTBACK_FILE = 'actum_postback_logs.json';
const LOC_FILE = 'loc_accounts.json';
const PROFILE_FILE = 'loc_payment_profiles.json';

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
const TransactionStore = {
  async getAll() { return loadFromS3(TX_FILE); },

  async getById(id) {
    return (await this.getAll()).find(t => t.id === id) || null;
  },

  async getByLocId(locId) {
    return (await this.getAll()).filter(t => t.locId === locId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async getByMerOrderNumber(mon) {
    return (await this.getAll()).find(t => t.merOrderNumber === mon) || null;
  },

  async getByActumOrderId(orderId) {
    return (await this.getAll()).find(t => t.actumOrderId === orderId) || null;
  },

  async getByIdempotenceKey(key) {
    return (await this.getAll()).find(t => t.idempotenceKey === key) || null;
  },

  async create(data) {
    const txns = await this.getAll();
    const txn = {
      id: uuidv4(),
      locId: data.locId,
      borrowerId: data.borrowerId || null,
      merOrderNumber: data.merOrderNumber,
      actumOrderId: data.actumOrderId || null,
      actumHistoryId: data.actumHistoryId || null,
      consumerUnique: data.consumerUnique || null,
      requestType: data.requestType || 'debit', // debit | credit | refund | revoke
      amount: data.amount,
      billingCycle: data.billingCycle || 'once',
      currency: data.currency || 'US',
      status: data.status || 'pending',
      declineReason: data.declineReason || null,
      authCode: data.authCode || null,
      maskedAccount: data.maskedAccount || null,
      maskedRouting: data.maskedRouting || null,
      accountType: data.accountType || null,
      idempotenceKey: data.idempotenceKey || null,
      rawResponse: data.rawResponse || null,
      duplicateTrans: data.duplicateTrans || false,
      testTrans: data.testTrans || false,
      memo: data.memo || null,
      ipAddress: data.ipAddress || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    txns.push(txn);
    await saveToS3(TX_FILE, txns);
    return txn;
  },

  async update(id, updates) {
    const txns = await this.getAll();
    const idx = txns.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Transaction not found');
    txns[idx] = { ...txns[idx], ...updates, updatedAt: new Date().toISOString() };
    await saveToS3(TX_FILE, txns);
    return txns[idx];
  },

  async updateByActumOrderId(orderId, updates) {
    const txns = await this.getAll();
    const idx = txns.findIndex(t => t.actumOrderId === orderId);
    if (idx === -1) return null;
    txns[idx] = { ...txns[idx], ...updates, updatedAt: new Date().toISOString() };
    await saveToS3(TX_FILE, txns);
    return txns[idx];
  },
};

// ─── EVENTS ───────────────────────────────────────────────────────────────────
const EventStore = {
  async log(event) {
    const events = await loadFromS3(EVENT_FILE);
    events.unshift({
      id: uuidv4(),
      transactionId: event.transactionId,
      actumOrderId: event.actumOrderId || null,
      eventType: event.eventType, // created | accepted | declined | returned | refunded | revoked | postback
      status: event.status,
      detail: event.detail || null,
      rawPayload: event.rawPayload || null,
      timestamp: new Date().toISOString(),
    });
    if (events.length > 5000) events.length = 5000;
    await saveToS3(EVENT_FILE, events);
  },

  async getByTransactionId(txnId) {
    return (await loadFromS3(EVENT_FILE)).filter(e => e.transactionId === txnId);
  },
};

// ─── POSTBACK LOGS ────────────────────────────────────────────────────────────
const PostbackStore = {
  async log(payload) {
    const logs = await loadFromS3(POSTBACK_FILE);
    logs.unshift({
      id: uuidv4(),
      rawPayload: payload,
      receivedAt: new Date().toISOString(),
    });
    if (logs.length > 2000) logs.length = 2000;
    await saveToS3(POSTBACK_FILE, logs);
  },
};

// ─── LOC ACCOUNTS ─────────────────────────────────────────────────────────────
const LocStore = {
  async getAll() { return loadFromS3(LOC_FILE); },
  async getById(id) { return (await this.getAll()).find(l => l.id === id) || null; },
  async create(data) {
    const locs = await this.getAll();
    const loc = { id: uuidv4(), ...data, createdAt: new Date().toISOString() };
    locs.push(loc);
    await saveToS3(LOC_FILE, locs);
    return loc;
  },
  async update(id, updates) {
    const locs = await this.getAll();
    const idx = locs.findIndex(l => l.id === id);
    if (idx === -1) throw new Error('LOC not found');
    locs[idx] = { ...locs[idx], ...updates, updatedAt: new Date().toISOString() };
    await saveToS3(LOC_FILE, locs);
    return locs[idx];
  },
};

// ─── PAYMENT PROFILES ─────────────────────────────────────────────────────────
const PaymentProfileStore = {
  async getByLocId(locId) {
    return (await loadFromS3(PROFILE_FILE)).filter(p => p.locId === locId);
  },
  async getByConsumerUnique(cu) {
    return (await loadFromS3(PROFILE_FILE)).find(p => p.consumerUnique === cu) || null;
  },
  async create(data) {
    const profiles = await loadFromS3(PROFILE_FILE);
    const profile = {
      id: uuidv4(),
      locId: data.locId,
      borrowerId: data.borrowerId || null,
      consumerUnique: data.consumerUnique,
      maskedAccount: maskAccount(data.accountNumber || ''),
      maskedRouting: maskRouting(data.routingNumber || ''),
      accountType: data.accountType || 'checking',
      holderName: data.holderName || '',
      createdAt: new Date().toISOString(),
    };
    profiles.push(profile);
    await saveToS3(PROFILE_FILE, profiles);
    return profile;
  },
};

module.exports = { TransactionStore, EventStore, PostbackStore, LocStore, PaymentProfileStore };
