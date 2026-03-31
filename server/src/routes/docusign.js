const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { sendWelcomeEmail } = require('../services/emailService');
const { updateZohoDeal } = require('../services/zohoService');
const ClientStore = require('../services/clientStore');
const UserStore = require('../services/userStore');
const { getPresignedUploadUrl, fileExists } = require('../services/s3Service');

const REGISTRY_PATH = path.join(__dirname, '../../data/documents.json');
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
function loadDocs() { try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); } catch { return []; } }
function saveDocs(docs) { fs.writeFileSync(REGISTRY_PATH, JSON.stringify(docs, null, 2)); }

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

    // Identify rep by sender email — each rep uses their own DocuSign account
    const senderEmail = envelopeSummary?.sender?.email || null;
    const rep = senderEmail ? UserStore.findByEmail(senderEmail) : null;
    let assignedRepId = rep?.id || null;
    let assignedRepName = rep?.full_name || 'Unassigned';

    // Extract business name from custom fields if present
    const customFields = envelopeSummary?.customFields?.textCustomFields || [];
    const businessNameField = customFields.find(f => f.name === 'businessName');

    console.log(`[DocuSign] Completed for: ${merchantName} <${merchantEmail}> | Rep: ${assignedRepName}`);

    // 1. Create or retrieve real client file
    let clientRecord = ClientStore.getByEmail(merchantEmail);
    if (!clientRecord) {
      try {
        clientRecord = ClientStore.create({
          businessName: businessNameField?.value || merchantName,
          ownerName: merchantName,
          email: merchantEmail,
          assignedRepId,
          assignedRepName,
          status: 'Pending',
          source: 'docusign',
          envelopeId,
        });
        console.log(`[DocuSign] Client file created: ${clientRecord.id}`);
      } catch (e) {
        console.error('[DocuSign] Client create failed:', e.message);
        // Last resort — use envelope ID as client ID so PDF still saves
        clientRecord = { id: `docusign_${envelopeId}` };
      }
    } else {
      // Update existing client with rep assignment if missing
      if (!clientRecord.assignedRepId && assignedRepId) {
        ClientStore.update(clientRecord.id, { assignedRepId, assignedRepName, envelopeId });
      }
      console.log(`[DocuSign] Existing client matched by email: ${clientRecord.id}`);
    }

    const clientId = clientRecord.id;

    // 2. Download signed PDF and store in S3
    try {
      const docusignService = require('../services/docusignService');
      const pdfBuffer = await docusignService.downloadSignedDocument(envelopeId);

      if (pdfBuffer) {
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
        const key = `clients/${clientId}/application/signed_application_${envelopeId}.pdf`;

        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          Metadata: { envelopeId, clientEmail: merchantEmail, clientName: merchantName, repId: assignedRepId || '' },
        }));

        const docs = loadDocs();
        docs.push({
          id: `doc_docusign_${envelopeId}`,
          key,
          clientId,
          assignedRepId,
          category: 'application',
          fileName: `Signed_Application_${merchantName.replace(/\s+/g, '_')}.pdf`,
          fileSize: `${(pdfBuffer.length / 1024).toFixed(0)} KB`,
          uploadedBy: 'docusign',
          uploadedAt: new Date().toISOString(),
          status: 'Approved',
          visibility: 'all',
          tags: ['docusign', 'signed'],
          note: `Auto-stored from DocuSign envelope ${envelopeId}`,
          extractionStatus: 'n/a',
          extractedFinancials: null,
        });
        saveDocs(docs);
        console.log(`[DocuSign] Signed PDF stored in S3: ${key}`);
      }
    } catch (e) { console.error('[DocuSign] PDF store failed:', e.message); }

    // 3. Send welcome email — non-fatal
    try {
      await sendWelcomeEmail({ to: merchantEmail, name: merchantName, envelopeId, subject });
    } catch (e) { console.error('[DocuSign] Email failed:', e.message); }

    // 4. Update Zoho — non-fatal
    try {
      await updateZohoDeal({ envelopeId, merchantEmail, merchantName, status: 'Agreement Signed' });
    } catch (e) { console.error('[DocuSign] Zoho failed:', e.message); }

    return res.status(200).json({
      received: true,
      action: 'processed',
      merchant: merchantEmail,
      clientId,
      assignedRepId,
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
