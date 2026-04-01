const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { sendWelcomeEmail } = require('../services/emailService');
const { updateZohoDeal } = require('../services/zohoService');
const ClientStore = require('../services/clientStore');
const UserStore = require('../services/userStore');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

function verifyDocuSignSignature(req) {
  const secret = process.env.DOCUSIGN_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = req.headers['x-docusign-signature-1'];
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const computed = Buffer.from(hmac.digest('base64'));
  const received = Buffer.from(signature);
  try { return crypto.timingSafeEqual(computed, received); } catch { return false; }
}

router.post('/webhook', express.json(), async (req, res) => {
  try {
    if (!verifyDocuSignSignature(req)) {
      console.warn('[DocuSign] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const status = event?.event || event?.status || event?.Status;
    const envelopeId = event?.data?.envelopeId || event?.envelopeId || event?.EnvelopeStatus?.EnvelopeID;
    const envelopeSummary = event?.data?.envelopeSummary || event;

    console.log(`[DocuSign] Webhook received. Status: ${status} | EnvelopeId: ${envelopeId}`);
    console.log(`[DocuSign] Payload keys: ${Object.keys(event).join(', ')}`);

    const isCompleted = ['envelope-completed', 'completed', 'Completed'].includes(status);
    if (!isCompleted && status !== undefined) {
      return res.status(200).json({ received: true, action: 'ignored', status });
    }

    let signers = envelopeSummary?.recipients?.signers
      || envelopeSummary?.Recipients?.Signers?.Signer
      || event?.recipients?.signers || [];
    if (signers && !Array.isArray(signers)) signers = [signers];
    const primarySigner = signers[0];

    if (!primarySigner) {
      console.warn('[DocuSign] No signer found');
      return res.status(200).json({ received: true, action: 'no_signer' });
    }

    const merchantEmail = primarySigner.email || primarySigner.Email;
    const merchantName = primarySigner.name || primarySigner.Name || primarySigner.UserName;
    const merchantPhone = primarySigner.phoneNumber || primarySigner.phone || '';
    const subject = envelopeSummary?.emailSubject || envelopeSummary?.Subject || 'Application';

    const senderEmail = envelopeSummary?.sender?.email || envelopeSummary?.Sender?.Email || event?.sender?.email || null;
    const rep = senderEmail ? await UserStore.findByEmail(senderEmail) : null;
    let assignedRepId = rep?.id || null;
    let assignedRepName = rep?.full_name || 'Unassigned';

    const customFields = envelopeSummary?.customFields?.textCustomFields
      || envelopeSummary?.CustomFields?.TextCustomFields?.TextCustomField || [];
    const cfArray = Array.isArray(customFields) ? customFields : [customFields];
    const businessNameField = cfArray.find(f => (f?.name || f?.Name) === 'businessName');

    console.log(`[DocuSign] Completed for: ${merchantName} <${merchantEmail}> | Rep: ${assignedRepName}`);

    // 1. Create or retrieve client file
    let clientRecord = await ClientStore.getByEmail(merchantEmail);
    if (!clientRecord) {
      try {
        clientRecord = await ClientStore.create({
          businessName: businessNameField?.value || merchantName,
          ownerName: merchantName, email: merchantEmail, phone: merchantPhone,
          assignedRepId, assignedRepName, status: 'Pending', source: 'docusign', envelopeId,
        });
        console.log(`[DocuSign] Client file created: ${clientRecord.id}`);
      } catch (e) {
        console.error('[DocuSign] Client create failed:', e.message);
        clientRecord = { id: `docusign_${envelopeId}` };
      }
    } else {
      if (!clientRecord.assignedRepId && assignedRepId) {
        await ClientStore.update(clientRecord.id, { assignedRepId, assignedRepName, envelopeId });
      }
      console.log(`[DocuSign] Existing client matched: ${clientRecord.id}`);
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
          Bucket: BUCKET, Key: key, Body: pdfBuffer, ContentType: 'application/pdf',
          Metadata: { envelopeId, clientEmail: merchantEmail, clientName: merchantName },
        }));

        const docs = await loadFromS3('documents.json');
        docs.push({
          id: `doc_docusign_${envelopeId}`, key, clientId, assignedRepId,
          category: 'application',
          fileName: `Signed_Application_${merchantName.replace(/\s+/g, '_')}.pdf`,
          fileSize: `${(pdfBuffer.length / 1024).toFixed(0)} KB`,
          uploadedBy: 'docusign', uploadedAt: new Date().toISOString(),
          status: 'Approved', visibility: 'all', tags: ['docusign', 'signed'],
          note: `Auto-stored from DocuSign envelope ${envelopeId}`,
          extractionStatus: 'n/a', extractedFinancials: null,
        });
        await saveToS3('documents.json', docs);
        console.log(`[DocuSign] Signed PDF stored: ${key}`);
      }
    } catch (e) { console.error('[DocuSign] PDF store failed:', e.message); }

    // 3. Auto-create client login
    try {
      const existingUser = await UserStore.findByEmail(merchantEmail);
      if (!existingUser) {
        const tempPassword = crypto.randomBytes(5).toString('hex');
        await UserStore.create({
          email: merchantEmail, full_name: merchantName, role: 'client',
          password: tempPassword, client_id: clientId, source: 'docusign',
          temp_password: tempPassword, business_name: businessNameField?.value || merchantName,
        });
        console.log(`[DocuSign] Client account created: ${merchantEmail} / ${tempPassword}`);
      } else {
        if (!existingUser.client_id) await UserStore.update(existingUser.id, { client_id: clientId });
        console.log(`[DocuSign] Existing user found for ${merchantEmail}`);
      }
    } catch (e) { console.error('[DocuSign] User create failed:', e.message); }

    // 4. Welcome email
    try { await sendWelcomeEmail({ to: merchantEmail, name: merchantName, envelopeId, subject }); }
    catch (e) { console.error('[DocuSign] Email failed:', e.message); }

    // 5. Zoho
    try { await updateZohoDeal({ envelopeId, merchantEmail, merchantName, status: 'Agreement Signed' }); }
    catch (e) { console.error('[DocuSign] Zoho failed:', e.message); }

    return res.status(200).json({ received: true, action: 'processed', merchant: merchantEmail, clientId, assignedRepId });
  } catch (err) {
    console.error('[DocuSign] Webhook error:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/request-document', express.json(), async (req, res) => {
  try {
    const { clientEmail, clientName, businessName, category, instructions, dueDate, repName, portalUrl } = req.body;
    const { sendDocumentRequestEmail } = require('../services/emailService');
    await sendDocumentRequestEmail({ clientEmail, clientName, businessName, category, instructions, dueDate, repName, portalUrl });
    return res.json({ sent: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get('/status/:envelopeId', async (req, res) => {
  try {
    const docusign = require('../services/docusignService');
    const status = await docusign.getEnvelopeStatus(req.params.envelopeId);
    return res.json(status);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

module.exports = router;
