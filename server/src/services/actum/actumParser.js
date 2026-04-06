/**
 * Actum Response Parser
 * Parses Actum's newline-delimited key=value response format
 * into a normalized internal transaction object.
 */

const STATUS_MAP = {
  accepted: 'accepted',
  declined: 'declined',
  pending: 'pending',
  error: 'declined',
};

const DECLINE_REASONS = {
  'invalid aba': 'Invalid routing number. Please verify and try again.',
  'merchant auth': 'Merchant authorization failed. Contact support.',
  'amount over limit': 'Payment amount exceeds the allowed limit.',
  'duplicate transaction': 'This payment has already been submitted.',
  'invalid consumer unique': 'Stored payment profile not found. Please re-enter bank details.',
  'insufficient funds': 'Insufficient funds in the account.',
  'account closed': 'The bank account is closed.',
  'unauthorized': 'The transaction was not authorized.',
};

function parseActumResponse(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { status: 'unknown', reason: 'Empty response', rawText: rawText || '' };
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fields = {};
  let postedVars = {};
  let inPostedVars = false;

  for (const line of lines) {
    if (line === 'PostedVars=BEGIN') { inPostedVars = true; continue; }
    if (line === 'PostedVars=END') { inPostedVars = false; continue; }

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim().toLowerCase();
    const value = line.slice(eqIdx + 1).trim();

    if (inPostedVars) {
      postedVars[key] = value;
    } else {
      fields[key] = value;
    }
  }

  const rawStatus = (fields.status || '').toLowerCase();
  const status = STATUS_MAP[rawStatus] || 'unknown';
  const reason = fields.reason || '';
  const friendlyReason = mapDeclineReason(reason);

  return {
    status,
    reason: friendlyReason || reason,
    rawReason: reason,
    orderId: fields.order_id || fields.orderid || null,
    historyId: fields.history_id || fields.historyid || null,
    consumerUnique: fields.consumer_unique || null,
    authCode: fields.authcode || null,
    duplicateTrans: fields.duplicatetrans === '1' || fields.duplicatetrans === 'true',
    testTrans: fields.testtrans === '1' || fields.testtrans === 'true',
    postedVars: Object.keys(postedVars).length > 0 ? postedVars : null,
    rawFields: fields,
    rawText,
  };
}

function mapDeclineReason(reason) {
  if (!reason) return null;
  const lower = reason.toLowerCase();
  for (const [key, friendly] of Object.entries(DECLINE_REASONS)) {
    if (lower.includes(key)) return friendly;
  }
  return null;
}

module.exports = { parseActumResponse, mapDeclineReason, DECLINE_REASONS };
