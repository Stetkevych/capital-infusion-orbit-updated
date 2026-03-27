const axios = require('axios');

const ZOHO_DOMAIN = process.env.ZOHO_ACCOUNT_DOMAIN || 'com';
const BASE_URL = `https://www.zohoapis.${ZOHO_DOMAIN}/crm/v2`;

// ─── Refresh Zoho access token ────────────────────────────────────────────────
async function getZohoToken() {
  const response = await axios.post(
    `https://accounts.zoho.${ZOHO_DOMAIN}/oauth/v2/token`,
    new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return response.data.access_token;
}

// ─── Find deal by merchant email ──────────────────────────────────────────────
async function findDealByEmail(email, token) {
  const response = await axios.get(`${BASE_URL}/Deals/search`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    params: { criteria: `(Email:equals:${email})` },
  });
  return response.data?.data?.[0] || null;
}

// ─── Update deal status in Zoho ───────────────────────────────────────────────
async function updateZohoDeal({ envelopeId, merchantEmail, merchantName, status }) {
  try {
    const token = await getZohoToken();

    // Search for existing deal
    const deal = await findDealByEmail(merchantEmail, token);

    if (deal) {
      // Update existing deal
      await axios.put(
        `${BASE_URL}/Deals/${deal.id}`,
        {
          data: [{
            Stage: status,
            DocuSign_Envelope_ID: envelopeId,
            DocuSign_Status: 'Completed',
            DocuSign_Completed_Date: new Date().toISOString(),
          }],
        },
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      console.log(`[Zoho] Updated deal ${deal.id} for ${merchantEmail} → ${status}`);
    } else {
      // Create new deal if not found
      await axios.post(
        `${BASE_URL}/Deals`,
        {
          data: [{
            Deal_Name: `${merchantName} - MCA Application`,
            Stage: status,
            Email: merchantEmail,
            DocuSign_Envelope_ID: envelopeId,
            DocuSign_Status: 'Completed',
            Lead_Source: 'DocuSign',
          }],
        },
        { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
      );
      console.log(`[Zoho] Created new deal for ${merchantEmail}`);
    }
  } catch (err) {
    // Don't throw — log and continue so webhook still succeeds
    console.error('[Zoho] Update failed:', err.response?.data || err.message);
  }
}

module.exports = { updateZohoDeal };
