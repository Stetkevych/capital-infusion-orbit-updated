/**
 * Actum Validation
 * Validates Orbit payment requests before mapping to Actum fields.
 */

const BILLING_CYCLES = ['once', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannually', 'annually'];
const ACCOUNT_TYPES = ['checking', 'savings'];
const STATE_CODES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU'];

function validatePaymentRequest(req) {
  const errors = [];

  // Required fields
  if (!req.borrowerName || req.borrowerName.trim().length < 2) errors.push('Account holder name is required.');
  if (!req.amount || isNaN(req.amount) || Number(req.amount) <= 0) errors.push('Payment amount must be greater than $0.');
  if (Number(req.amount) > 999999.99) errors.push('Payment amount exceeds maximum allowed.');

  // Bank details (not required for repeat consumer)
  if (!req.consumerUnique) {
    if (!req.routingNumber) errors.push('Routing number is required.');
    else if (!/^\d{8,9}$/.test(req.routingNumber)) errors.push('Routing number must be 8-9 digits.');

    if (!req.accountNumber) errors.push('Account number is required.');
    else if (req.accountNumber.length > 17) errors.push('Account number must be 17 digits or fewer.');
    else if (!/^\d+$/.test(req.accountNumber)) errors.push('Account number must contain only digits.');

    if (req.accountType && !ACCOUNT_TYPES.includes(req.accountType)) errors.push('Account type must be checking or savings.');
  } else {
    // Repeat consumer validation
    if (!req.consumerUnique || req.consumerUnique.trim().length === 0) errors.push('Consumer unique ID is required for repeat payments.');
  }

  // Address (optional but validate format if provided)
  if (req.zip && !/^\d{5}(-\d{4})?$/.test(req.zip)) errors.push('ZIP code must be 5 digits (or 5+4 format).');
  if (req.state && !STATE_CODES.includes(req.state.toUpperCase())) errors.push('Invalid state code.');

  // Email
  if (req.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) errors.push('Invalid email address.');

  // Billing cycle
  if (req.billingCycle && !BILLING_CYCLES.includes(req.billingCycle)) {
    errors.push('Invalid billing cycle. Must be: ' + BILLING_CYCLES.join(', '));
  }

  // Date format (YYYY-MM-DD or MM/DD/YYYY)
  if (req.effectiveDate) {
    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(req.effectiveDate) || /^\d{2}\/\d{2}\/\d{4}$/.test(req.effectiveDate);
    if (!dateValid) errors.push('Effective date must be YYYY-MM-DD or MM/DD/YYYY format.');
  }

  if (req.birthDate) {
    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(req.birthDate) || /^\d{2}\/\d{2}\/\d{4}$/.test(req.birthDate);
    if (!dateValid) errors.push('Birth date must be YYYY-MM-DD or MM/DD/YYYY format.');
  }

  return { valid: errors.length === 0, errors };
}

function validateRepeatConsumer(req) {
  const errors = [];
  if (!req.consumerUnique) errors.push('Consumer unique ID is required.');
  if (!req.amount || Number(req.amount) <= 0) errors.push('Payment amount must be greater than $0.');
  return { valid: errors.length === 0, errors };
}

module.exports = { validatePaymentRequest, validateRepeatConsumer, BILLING_CYCLES, ACCOUNT_TYPES };
