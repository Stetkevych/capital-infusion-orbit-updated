const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { sendWelcomeEmail } = require('../services/emailService');
const { updateZohoDeal } = require('../services/zohoService');
const { createPendingClient } = require('../services/clientService');

// ─── Verify DocuSign HMAC signature ──────────────────────────────────────────
function verifyDocuSignSignature(req) {
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;
  if (!secret) return true; // skip in dev if not set

  const signature = req.headers['x-docusign-signature-1'];
  if (!signature) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const computed = Buffer.from(hmac.digest('base64'));
  const received = Buffer.from(signature);

  try {
    return crypto.timingSafeEqual(computed, received);
  } catch {
    return false;
  }
}

// ─── POST /api/docusign/webhook ───────────────────────────────────────────────
router.post('/webhook', express.json(), async (req, res) => {
  try {
    if (!verifyDocuSignSignature(req)) {
      console.warn('[DocuSign] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const status = event?.event;
    const envelopeId = event?.data?.envelopeId;
    const envelopeSummary = event?.data?.envelopeSummary;

    console.log(`[DocuSign] Event: ${status} | Envelope: ${envelopeId}`);

    // Only process completed envelopes
    if (status !== 'envelope-completed') {
      return res.status(200).json({ received: true, action: 'ignored' });
    }

    // Extract signer info from recipients
    const signers = envelopeSummary?.recipients?.signers || [];
    const primarySigner = signers[0];

    if (!primarySigner) {
      console.warn('[DocuSign] No signer found in envelope');
      return res.status(200).json({ received: true, action: 'no_signer' });
    }

    const merchantEmail = primarySigner.email;
    const merchantName = primarySigner.name;
    const subject = envelopeSummary?.emailSubject || 'Merchant Agreement';

    console.log(`[DocuSign] Completed for: ${merchantName} <${merchantEmail}>`);

    // 1. Send welcome email — non-fatal
    try {
      await sendWelcomeEmail({ to: merchantEmail, name: merchantName, envelopeId, subject });
    } catch (e) { console.error('[DocuSign] Email failed:', e.message); }

    // 2. Update Zoho — non-fatal
    try {
      await updateZohoDeal({ envelopeId, merchantEmail, merchantName, status: 'Agreement Signed' });
    } catch (e) { console.error('[DocuSign] Zoho failed:', e.message); }

    // 3. Create pending client — non-fatal
    try {
      await createPendingClient({ email: merchantEmail, name: merchantName, envelopeId, source: 'docusign' });
    } catch (e) { console.error('[DocuSign] Client create failed:', e.message); }

    return res.status(200).json({
      received: true,
      action: 'processed',
      merchant: merchantEmail,
    });

  } catch (err) {
    console.error('[DocuSign] Webhook error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// ─── POST /api/docusign/request-document ────────────────────────────────────
router.post('/request-document', express.json(), async (req, res) => {
  try {
    const { clientEmail, clientName, businessName, category, instructions, dueDate, repName, portalUrl } = req.body;
    const { sendDocumentRequestEmail } = require('../services/emailService');
    await sendDocumentRequestEmail({ clientEmail, clientName, businessName, category, instructions, dueDate, repName, portalUrl });
    return res.json({ sent: true });
  } catch (err) {
    console.error('[DocuSign] Request email failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/docusign/status/:envelopeId ─────────────────────────────────────
router.get('/status/:envelopeId', async (req, res) => {
  try {
    const docusign = require('../services/docusignService');
    const status = await docusign.getEnvelopeStatus(req.params.envelopeId);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
