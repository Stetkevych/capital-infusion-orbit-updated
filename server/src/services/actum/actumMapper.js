/**
 * Actum Field Mapper
 * Maps Orbit internal payment request fields to Actum API field names.
 */

const crypto = require('crypto');

function generateMerOrderNumber(locId) {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString('hex');
  return `ORBIT-${locId ? locId.slice(0, 8) : 'LOC'}-${ts}-${rand}`.toUpperCase();
}

function generateIdempotenceKey(locId, amount, timestamp) {
  const raw = `${locId}-${amount}-${timestamp || Date.now()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function maskAccount(acct) {
  if (!acct || acct.length < 4) return '****';
  return '****' + acct.slice(-4);
}

function maskRouting(aba) {
  if (!aba || aba.length < 4) return '****';
  return '****' + aba.slice(-4);
}

/**
 * Map Orbit payment request to Actum form fields
 * @param {Object} orbit - Orbit payment request
 * @param {Object} config - { parentId, subId }
 * @returns {Object} Actum form fields
 */
function mapOrbitToActum(orbit, config) {
  const fields = {
    parent_id: config.parentId,
    sub_id: config.subId,
    pmt_type: 'chk',
    custname: orbit.borrowerName || '',
    companyname: orbit.businessName || '',
    custemail: orbit.email || '',
    custaddress1: orbit.address1 || '',
    custaddress2: orbit.address2 || '',
    custcity: orbit.city || '',
    custstate: orbit.state || '',
    custzip: orbit.zip || '',
    custphone: orbit.phone || '',
    acct_type: orbit.accountType === 'savings' ? 'S' : 'C',
    chk_acct: orbit.accountNumber || '',
    chk_aba: orbit.routingNumber || '',
    currency: 'US',
    initial_amount: String(orbit.amount || 0),
    merordernumber: orbit.merOrderNumber || generateMerOrderNumber(orbit.locId),
    postback: '1',
    idempotence: orbit.idempotenceKey || generateIdempotenceKey(orbit.locId, orbit.amount),
  };

  // Optional fields
  if (orbit.ssn) fields.custssn = orbit.ssn;
  if (orbit.birthDate) fields.birth_date = orbit.birthDate;
  if (orbit.ipAddress) fields.ip_forward = orbit.ipAddress;
  if (orbit.memo) fields.addenda = orbit.memo;

  // Recurring fields
  if (orbit.billingCycle) {
    fields.billing_cycle = orbit.billingCycle;
    if (orbit.recurAmount) fields.recur_amount = String(orbit.recurAmount);
    if (orbit.daysTilRecur) fields.days_til_recur = String(orbit.daysTilRecur);
    if (orbit.maxBillings) fields.max_num_billing = String(orbit.maxBillings);
  }

  // Credit (disbursement) vs debit (collection)
  if (orbit.paymentType === 'credit') {
    fields.action_code = 'P';
    fields.creditflag = '1';
  }

  // Same-day ACH
  if (orbit.sameDay) {
    fields.trans_modifier = 'S';
  }

  // Future-dated initial
  if (orbit.effectiveDate) {
    fields.futureinitial = orbit.effectiveDate;
  }

  // Retry fee
  if (orbit.retryFeeAmount) {
    fields.retry_fee_amt = String(orbit.retryFeeAmount);
  }

  // Real-time processing
  if (orbit.realtime) {
    fields.realtime = '1';
  }

  return fields;
}

/**
 * Map repeat-consumer request (skip bank details)
 */
function mapRepeatConsumer(orbit, config) {
  return {
    parent_id: config.parentId,
    sub_id: config.subId,
    pmt_type: 'chk',
    consumer_unique: orbit.consumerUnique,
    consumer_code: orbit.consumerCode || '',
    initial_amount: String(orbit.amount || 0),
    merordernumber: orbit.merOrderNumber || generateMerOrderNumber(orbit.locId),
    postback: '1',
    idempotence: orbit.idempotenceKey || generateIdempotenceKey(orbit.locId, orbit.amount),
    currency: 'US',
    ...(orbit.billingCycle ? { billing_cycle: orbit.billingCycle } : {}),
    ...(orbit.recurAmount ? { recur_amount: String(orbit.recurAmount) } : {}),
    ...(orbit.memo ? { addenda: orbit.memo } : {}),
    ...(orbit.paymentType === 'credit' ? { action_code: 'P', creditflag: '1' } : {}),
  };
}

module.exports = {
  mapOrbitToActum,
  mapRepeatConsumer,
  generateMerOrderNumber,
  generateIdempotenceKey,
  maskAccount,
  maskRouting,
};
