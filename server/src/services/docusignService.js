const axios = require('axios');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;

// Production vs demo detection
const configuredBase = process.env.DOCUSIGN_BASE_URI || 'https://na4.docusign.net';
const isDemo = configuredBase.includes('demo');
const AUTH_SERVER = isDemo ? 'account-d.docusign.com' : 'account.docusign.com';

let _cachedBaseUri = configuredBase;

// ─── Get JWT access token ─────────────────────────────────────────────────────
async function getAccessToken() {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY
    ? process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
    : fs.readFileSync('./docusign_private.key', 'utf8');

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: AUTH_SERVER,
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation',
  };

  const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  const response = await axios.post(
    `https://${AUTH_SERVER}/oauth/token`,
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  return response.data.access_token;
}

// ─── Auto-detect correct base URI from userinfo ───────────────────────────────
async function getBaseUri() {
  if (_cachedBaseUri && _cachedBaseUri !== 'https://na4.docusign.net') return _cachedBaseUri;
  try {
    const token = await getAccessToken();
    const res = await axios.get(`https://${AUTH_SERVER}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const account = (res.data.accounts || []).find(a => a.account_id === ACCOUNT_ID) || res.data.accounts?.[0];
    if (account?.base_uri) {
      _cachedBaseUri = account.base_uri;
      console.log(`[DocuSign] Base URI resolved: ${_cachedBaseUri}`);
    }
  } catch (e) {
    console.warn('[DocuSign] Could not auto-detect base URI, using configured:', _cachedBaseUri);
  }
  return _cachedBaseUri;
}

// ─── Get envelope status ──────────────────────────────────────────────────────
async function getEnvelopeStatus(envelopeId) {
  const [token, baseUri] = await Promise.all([getAccessToken(), getBaseUri()]);
  const url = `${baseUri}/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}`;

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
  const [token, baseUri] = await Promise.all([getAccessToken(), getBaseUri()]);
  const url = `${baseUri}/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${envelopeId}/documents/combined`;

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer',
  });

  return response.data; // PDF buffer — upload to S3
}

module.exports = { getAccessToken, getEnvelopeStatus, downloadDocument, downloadSignedDocument: downloadDocument };
