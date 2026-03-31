const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const BASE_URI = process.env.DOCUSIGN_BASE_URI || 'https://demo.docusign.net';
const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;

// ─── Get JWT access token ─────────────────────────────────────────────────────
async function getAccessToken() {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY
    ? process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : fs.readFileSync('./docusign_private.key', 'utf8');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  };

  const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  const response = await axios.post(
    'https://account-d.docusign.com/oauth/token',
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data.access_token;
}

// ─── Get envelope status ──────────────────────────────────────────────────────
async function getEnvelopeStatus(envelopeId) {
  const token = await getAccessToken();
  const url = `${BASE_URI}/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return {
    envelopeId,
    status: response.data.status,
    completedAt: response.data.completedDateTime,
    subject: response.data.emailSubject,
    sender: response.data.sender,
  };
}

// ─── Download completed document ─────────────────────────────────────────────
async function downloadDocument(envelopeId) {
  const token = await getAccessToken();
  const url = `${BASE_URI}/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/documents/combined`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer',
  });

  return response.data; // PDF buffer — upload to S3
}

module.exports = { getAccessToken, getEnvelopeStatus, downloadDocument, downloadSignedDocument: downloadDocument };
