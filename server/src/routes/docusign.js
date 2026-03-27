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

    // 1. Send welcome email to merchant
    await sendWelcomeEmail({
      to: merchantEmail,
      name: merchantName,
      envelopeId,
      subject,
    });

    // 2. Update Zoho CRM deal status
    await updateZohoDeal({
      envelopeId,
      merchantEmail,
      merchantName,
      status: 'Agreement Signed',
    });

    // 3. Create pending client record in platform
    await createPendingClient({
      email: merchantEmail,
      name: merchantName,
      envelopeId,
      source: 'docusign',
    });

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
