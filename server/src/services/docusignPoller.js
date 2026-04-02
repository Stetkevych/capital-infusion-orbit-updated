const axios = require('axios');
const ClientStore = require('./clientStore');
const UserStore = require('./userStore');
const { loadFromS3, saveToS3 } = require('./s3Store');
const crypto = require('crypto');

const POLL_INTERVAL = 60 * 1000; // 60 seconds
let lastChecked = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // start from 24h ago

async function getAccessToken() {
  const docusignService = require('./docusignService');
  return await docusignService.getAccessToken();
}

async function getBaseUri() {
  const docusignService = require('./docusignService');
  return await docusignService.getBaseUri ? await docusignService.getBaseUri() : (process.env.DOCUSIGN_BASE_URI || 'https://na4.docusign.net');
}

async function pollCompletedEnvelopes() {
  try {
    const token = await getAccessToken();
    const baseUri = await getBaseUri();
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    if (!token || !accountId) {
      console.log('[DocuSign Poll] Missing token or accountId, skipping');
      return;
    }

    const fromDate = lastChecked;
    const url = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes?from_date=${encodeURIComponent(fromDate)}&status=completed&order_by=last_modified&order=desc`;

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const envelopes = res.data?.envelopes || [];
    if (envelopes.length === 0) return;

    console.log(`[DocuSign Poll] Found ${envelopes.length} completed envelope(s) since ${fromDate}`);

    // Track processed envelopes
    const processed = await loadFromS3('processed_envelopes.json');
    const processedIds = new Set(processed.map(p => p.envelopeId));

    for (const env of envelopes) {
      if (processedIds.has(env.envelopeId)) continue;

      console.log(`[DocuSign Poll] Processing envelope: ${env.envelopeId}`);

      try {
        // Get full envelope details with recipients and tabs
        const detailUrl = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${env.envelopeId}/recipients?include_tabs=true`;
        const detailRes = await axios.get(detailUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const signers = detailRes.data?.signers || [];
        const primarySigner = signers[0];
        if (!primarySigner) continue;

        const merchantEmail = primarySigner.email;
        const merchantName = primarySigner.name;

        // Parse tabs
        const tabs = primarySigner.tabs || {};
        const allTabs = [
          ...(tabs.textTabs || []),
          ...(tabs.numberTabs || []),
          ...(tabs.emailTabs || []),
          ...(tabs.dateTabs || []),
        ];
        const tabMap = {};
        allTabs.forEach(t => {
          const label = (t.tabLabel || '').toLowerCase().trim();
          const value = (t.value || '').trim();
          if (label && value) tabMap[label] = value;
        });

        const parsedPhone = tabMap['phone'] || tabMap['phonenumber'] || tabMap['phone number'] || '';
        const parsedBusinessName = tabMap['businessname'] || tabMap['business name'] || tabMap['business'] || tabMap['company'] || '';
        const parsedIndustry = tabMap['industry'] || tabMap['business type'] || '';
        const parsedState = tabMap['state'] || tabMap['st'] || '';

        // Get sender info
        const envelopeUrl = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${env.envelopeId}`;
        const envRes = await axios.get(envelopeUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const senderEmail = envRes.data?.sender?.email || '';
        const rep = senderEmail ? await UserStore.findByEmail(senderEmail) : null;
        const assignedRepId = rep?.id || null;
        const assignedRepName = rep?.full_name || 'Unassigned';

        console.log(`[DocuSign Poll] Signer: ${merchantName} <${merchantEmail}> | Sender: ${senderEmail} | Tabs: ${Object.keys(tabMap).join(', ')}`);

        // 1. Create client
        let clientRecord = await ClientStore.getByEmail(merchantEmail);
        if (!clientRecord) {
          clientRecord = await ClientStore.create({
            businessName: parsedBusinessName || merchantName,
            ownerName: merchantName,
            email: merchantEmail,
            phone: parsedPhone,
            industry: parsedIndustry,
            state: parsedState,
            assignedRepId,
            assignedRepName,
            status: 'Pending',
            source: 'docusign',
            envelopeId: env.envelopeId,
            tabData: tabMap,
          });
          console.log(`[DocuSign Poll] Client created: ${clientRecord.id}`);
        }

        const clientId = clientRecord.id;

        // 2. Download and store signed PDF
        try {
          const docusignService = require('./docusignService');
          const pdfBuffer = await docusignService.downloadDocument(env.envelopeId);
          if (pdfBuffer) {
            const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
            const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
            const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
            const key = `clients/${clientId}/application/signed_application_${env.envelopeId}.pdf`;

            await s3.send(new PutObjectCommand({
              Bucket: BUCKET, Key: key, Body: pdfBuffer, ContentType: 'application/pdf',
            }));

            const docs = await loadFromS3('documents.json');
            docs.push({
              id: `doc_docusign_${env.envelopeId}`, key, clientId, assignedRepId,
              category: 'application',
              fileName: `Signed_Application_${merchantName.replace(/\s+/g, '_')}.pdf`,
              fileSize: `${(pdfBuffer.length / 1024).toFixed(0)} KB`,
              uploadedBy: 'docusign', uploadedAt: new Date().toISOString(),
              status: 'Approved', visibility: 'all', tags: ['docusign', 'signed'],
              note: `Auto-stored from DocuSign envelope ${env.envelopeId}`,
              extractionStatus: 'n/a', extractedFinancials: null,
            });
            await saveToS3('documents.json', docs);
            console.log(`[DocuSign Poll] PDF stored: ${key}`);

            // Run Textract on the application to extract additional fields
            try {
              const { extractBankStatement } = require('./textractService');
              const extraction = await extractBankStatement(key);
              if (extraction.success) {
                // Parse application-specific fields from the text
                const lines = (extraction.lines || []).join('\n').toLowerCase();
                const phoneMatch = lines.match(/(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/);
                const stateMatch = lines.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i);
                const updates = {};
                if (phoneMatch && !clientRecord.phone) updates.phone = phoneMatch[1];
                if (stateMatch && !clientRecord.state) updates.state = stateMatch[1].toUpperCase();
                if (Object.keys(updates).length > 0) {
                  await ClientStore.update(clientId, updates);
                  console.log(`[DocuSign Poll] Textract updated client with:`, updates);
                }
              }
            } catch (te) { console.log(`[DocuSign Poll] Textract on app skipped: ${te.message}`); }
          }
        } catch (e) { console.error(`[DocuSign Poll] PDF failed: ${e.message}`); }

        // 3. Create user account
        try {
          const existingUser = await UserStore.findByEmail(merchantEmail);
          if (!existingUser) {
            const tempPassword = crypto.randomBytes(5).toString('hex');
            await UserStore.create({
              email: merchantEmail, full_name: merchantName, role: 'client',
              password: tempPassword, client_id: clientId, source: 'docusign',
              temp_password: tempPassword, business_name: parsedBusinessName || merchantName,
            });
            console.log(`[DocuSign Poll] Account created: ${merchantEmail} / ${tempPassword}`);
          }
        } catch (e) { console.error(`[DocuSign Poll] User create failed: ${e.message}`); }

        // Mark as processed
        processed.push({ envelopeId: env.envelopeId, processedAt: new Date().toISOString(), email: merchantEmail });
        await saveToS3('processed_envelopes.json', processed);

      } catch (e) {
        console.error(`[DocuSign Poll] Error processing ${env.envelopeId}: ${e.message}`);
      }
    }

    lastChecked = new Date().toISOString();
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('[DocuSign Poll] Auth failed — token may need refresh, will retry next cycle');
    } else {
      console.error('[DocuSign Poll] Error:', err.message);
    }
  }
}

function startPolling() {
  console.log('[DocuSign Poll] Starting envelope polling every 60 seconds');
  pollCompletedEnvelopes(); // run immediately
  setInterval(pollCompletedEnvelopes, POLL_INTERVAL);
}

module.exports = { startPolling, pollCompletedEnvelopes };
