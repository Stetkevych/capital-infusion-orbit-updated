const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const EventLogger = require('./eventLogger');

const STORE_PATH = path.join(__dirname, '../../data/deals.json');
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return []; }
}
function save(deals) { fs.writeFileSync(STORE_PATH, JSON.stringify(deals, null, 2)); }

function daysBetween(a, b) {
  if (!a || !b) return null;
  try {
    const diff = new Date(b) - new Date(a);
    return Math.round(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

function calcDurations(d) {
  return {
    days_submit_to_docs:        daysBetween(d.application_submitted_at, d.docs_uploaded_at),
    days_docs_to_underwrite:    daysBetween(d.docs_uploaded_at, d.underwritten_at),
    days_underwrite_to_approve: daysBetween(d.underwritten_at, d.approved_at),
    days_approve_to_fund:       daysBetween(d.approved_at, d.funded_at),
    days_total_to_fund:         daysBetween(d.application_submitted_at, d.funded_at),
  };
}

const DealStore = {
  getAll() { return load(); },
  getByRep(repId) { return load().filter(d => d.rep_id === repId); },
  getById(id) { return load().find(d => d.deal_id === id) || null; },

  create(data) {
    const deals = load();
    const now = new Date();
    const deal = {
      deal_id: uuidv4(),
      rep_id: data.rep_id,
      rep_name: data.rep_name,
      client_id: data.client_id || null,
      client_name: data.client_name,
      lender_name: data.lender_name,
      stage: data.stage || 'Submitted',
      approval_status: (data.stage || 'submitted').toLowerCase(),
      requested_amount: parseFloat(data.requested_amount) || 0,
      approved_amount: parseFloat(data.approved_amount) || null,
      funded_amount: parseFloat(data.funded_amount) || null,
      factor_rate: parseFloat(data.factor_rate) || null,
      payback_amount: parseFloat(data.payback_amount) || null,
      industry: data.industry || '',
      state: data.state || '',
      position: data.position || '1st',
      source: data.source || 'direct',
      notes: data.notes || '',
      // Stage timestamps
      application_submitted_at: data.submitted_date ? new Date(data.submitted_date).toISOString() : now.toISOString(),
      docs_uploaded_at: data.docs_uploaded_at || null,
      underwritten_at: data.underwritten_at || null,
      approved_at: data.approved_date ? new Date(data.approved_date).toISOString() : null,
      funded_at: data.funded_date ? new Date(data.funded_date).toISOString() : null,
      // Debt metrics
      total_existing_mca_balance: parseFloat(data.total_existing_mca_balance) || null,
      daily_payment_obligation: parseFloat(data.daily_payment_obligation) || null,
      withholding_percentage: parseFloat(data.withholding_percentage) || null,
      created_at: now.toISOString(),
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
    };

    // Calculate stage durations
    Object.assign(deal, calcDurations(deal));

    deals.push(deal);
    save(deals);
    EventLogger.deal(deal);
    return deal;
  },

  update(id, updates) {
    const deals = load();
    const idx = deals.findIndex(d => d.deal_id === id);
    if (idx === -1) throw new Error('Deal not found');

    // Auto-set timestamps when stage changes
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
    save(deals);
    EventLogger.deal({ ...deals[idx], event_subtype: 'status_update' });
    return deals[idx];
  },
};

module.exports = DealStore;
