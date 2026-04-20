/**
 * OnyxIQ API Client
 * Communicates with OnyxIQ sandbox for LOC operations.
 * Base: https://services.sandbox.onyxiq.com/api/v1/tenant
 */

const ONYX_BASE = process.env.ONYX_API_URL || 'https://services.sandbox.onyxiq.com/api/v1/tenant';
const ONYX_KEY = process.env.ONYX_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzY29wZSI6InRlbmFudC1wdWJsaWMtYXBpIiwiaXNzIjoiT255eElRIiwidGVuYW50SWQiOjM0LCJleHAiOjE4MDc3NDIwNzh9.iQN4sR9a6eHAreeyj578K5Nbd0KVMXUx6rhQPbgGQ2n2LCshq_e7T80M5PqSFJaE8PgfGJfvqndp7CoRvFE3fw';

const headers = {
  'Authorization': `Bearer ${ONYX_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

async function onyxFetch(path, method = 'GET', body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${ONYX_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    console.error(`[Onyx] ${method} ${path} -> ${res.status}`, data);
    throw new Error(data.errors?.[0] || data.message || `Onyx API error ${res.status}`);
  }
  return data;
}

const OnyxClient = {
  // Clients
  async listClients(page = 0, size = 50) {
    return onyxFetch(`/clients?page=${page}&size=${size}`);
  },
  async getClient(id) {
    return onyxFetch(`/clients/${id}`);
  },
  async createClient({ externalId, name, email, dateOfOwnership, grossMonthlySales, owners, dbaName, ein, phoneNumber, businessType, addresses }) {
    return onyxFetch('/clients', 'POST', {
      externalId, name, email, dateOfOwnership, grossMonthlySales,
      owners: owners || [{ primary: true, percent: 100, contact: { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') || name, email } }],
      dbaName, ein, phoneNumber, businessType, addresses,
    });
  },

  // Applications
  async createApplication({ clientId, type = 'New', externalId }) {
    return onyxFetch('/applications', 'POST', { clientId, type, externalId: externalId || `orbit-${Date.now()}` });
  },
  async getApplication(id) {
    return onyxFetch(`/applications/${id}`);
  },

  // Payments
  async listPayments({ fundingId, applicationId }) {
    const param = fundingId ? `fundingId=${fundingId}` : `applicationId=${applicationId}`;
    return onyxFetch(`/payments?${param}`);
  },
  async createPayment({ amount, paymentType = 'Manual', paymentMethod = 'ACH', externalId, fundingId, applicationId, effectiveDate }) {
    return onyxFetch('/payments', 'POST', {
      amount, paymentType, paymentMethod,
      externalId: externalId || `orbit-pay-${Date.now()}`,
      fundingId, applicationId, effectiveDate,
    });
  },
};

module.exports = OnyxClient;
