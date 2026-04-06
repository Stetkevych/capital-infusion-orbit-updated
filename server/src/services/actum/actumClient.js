/**
 * Actum HTTP Client
 * Handles form-urlencoded POST requests to Actum Processing API.
 * Redacts sensitive data from logs. Never exposes credentials to frontend.
 */

const https = require('https');
const querystring = require('querystring');
const { parseActumResponse } = require('./actumParser');
const { maskAccount, maskRouting } = require('./actumMapper');

const ACTUM_ENDPOINT = process.env.ACTUM_ENDPOINT || 'https://join.actumprocessing.com/cgi-bin/dbs/man_trans.cgi';
const TIMEOUT_MS = 30000;

// Fields to redact from logs
const SENSITIVE_FIELDS = ['chk_acct', 'chk_aba', 'custssn', 'parent_id', 'sub_id', 'consumer_code'];

function redactForLog(fields) {
  const safe = { ...fields };
  for (const key of SENSITIVE_FIELDS) {
    if (safe[key]) {
      if (key === 'chk_acct') safe[key] = maskAccount(safe[key]);
      else if (key === 'chk_aba') safe[key] = maskRouting(safe[key]);
      else safe[key] = '***REDACTED***';
    }
  }
  return safe;
}

/**
 * Send a form-urlencoded POST to Actum
 * @param {Object} formFields - key/value pairs for the request
 * @returns {Promise<Object>} Normalized Actum response
 */
async function sendToActum(formFields) {
  const body = querystring.stringify(formFields);
  const url = new URL(ACTUM_ENDPOINT);

  console.log('[Actum] Sending request:', JSON.stringify(redactForLog(formFields)));

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: TIMEOUT_MS,
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('[Actum] Response status:', res.statusCode);
        if (res.statusCode !== 200) {
          console.error('[Actum] Non-200 response:', res.statusCode, data.slice(0, 200));
          return reject(new Error(`Actum returned HTTP ${res.statusCode}`));
        }
        try {
          const parsed = parseActumResponse(data);
          console.log('[Actum] Parsed:', { status: parsed.status, orderId: parsed.orderId, historyId: parsed.historyId, duplicate: parsed.duplicateTrans });
          resolve(parsed);
        } catch (err) {
          console.error('[Actum] Parse error:', err.message);
          reject(new Error('Failed to parse Actum response'));
        }
      });
    });

    req.on('error', (err) => {
      console.error('[Actum] Request error:', err.message);
      reject(new Error('Actum connection failed: ' + err.message));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Actum request timed out'));
    });

    req.write(body);
    req.end();
  });
}

module.exports = { sendToActum, redactForLog };
