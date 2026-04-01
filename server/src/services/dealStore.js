const { v4: uuidv4 } = require('uuid');
const { loadFromS3, saveToS3 } = require('./s3Store');
const EventLogger = require('./eventLogger');

const FILE = 'deals.json';
async function load() { return await loadFromS3(FILE); }
async function save(data) { await saveToS3(FILE, data); }

function daysBetween(a, b) {
  if (!a || !b) return null;
  try { return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24)); } catch { return null; }
}

function calcDurations(d) {
  return {
    days_submit_to_docs: daysBetween(d.application_submitted_at, d.docs_uploaded_at),
    days_docs_to_underwrite: daysBetween(d.docs_uploaded_at, d.underwritten_at),
    days_underwrite_to_approve: daysBetween(d.underwritten_at, d.approved_at),
    days_approve_to_fund: daysBetween(d.approved_at, d.funded_at),
    days_total_to_fund: daysBetween(d.application_submitted_at, d.funded_at),
  };
}

const DealStore = {
  async getAll() { return await load(); },
  async getByRep(repId) { return (await load()).filter(d => d.rep_id === repId); },
  async getById(id) { return (await load()).find(d => d.deal_id === id) || null; },

  async create(data) {
    const deals = await load();
    const now = new Date();
    const deal = {
      deal_id: uuidv4(),
      rep_id: data.rep_id, rep_name: data.rep_name,
      client_id: data.client_id || null, client_name: data.client_name,
      lender_name: data.lender_name, stage: data.stage || 'Submitted',
      approval_status: (data.stage || 'submitted').toLowerCase(),
      requested_amount: parseFloat(data.requested_amount) || 0,
      approved_amount: parseFloat(data.approved_amount) || null,
      funded_amount: parseFloat(data.funded_amount) || null,
      factor_rate: parseFloat(data.factor_rate) || null,
      payback_amount: parseFloat(data.payback_amount) || null,
      industry: data.industry || '', state: data.state || '',
      position: data.position || '1', source: data.source || '',
      notes: data.notes || '',
      application_submitted_at: data.submitted_date ? new Date(data.submitted_date).toISOString() : now.toISOString(),
      docs_uploaded_at: data.docs_uploaded_at || null,
      underwritten_at: data.underwritten_at || null,
      approved_at: data.approved_date ? new Date(data.approved_date).toISOString() : null,
      funded_at: data.funded_date ? new Date(data.funded_date).toISOString() : null,
      total_existing_mca_balance: parseFloat(data.total_existing_mca_balance) || null,
      daily_payment_obligation: parseFloat(data.daily_payment_obligation) || null,
      withholding_percentage: parseFloat(data.withholding_percentage) || null,
      created_at: now.toISOString(),
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    };
    Object.assign(deal, calcDurations(deal));
    deals.push(deal);
    await save(deals);
    EventLogger.deal(deal);
    return deal;
  },

  async update(id, updates) {
    const deals = await load();
    const idx = deals.findIndex(d => d.deal_id === id);
    if (idx === -1) throw new Error('Deal not found');
    const stage = updates.stage || updates.approval_status;
    if (stage) {
      const ts = new Date().toISOString();
      if (['approved'].includes(stage?.toLowerCase()) && !deals[idx].approved_at) updates.approved_at = ts;
      if (['funded'].includes(stage?.toLowerCase()) && !deals[idx].funded_at) updates.funded_at = ts;
      if (['underwritten', 'under review'].includes(stage?.toLowerCase()) && !deals[idx].underwritten_at) updates.underwritten_at = ts;
      updates.approval_status = stage.toLowerCase();
    }
    deals[idx] = { ...deals[idx], ...updates, updated_at: new Date().toISOString() };
    Object.assign(deals[idx], calcDurations(deals[idx]));
    await save(deals);
    EventLogger.deal({ ...deals[idx], event_subtype: 'status_update' });
    return deals[idx];
  },
};

module.exports = DealStore;
