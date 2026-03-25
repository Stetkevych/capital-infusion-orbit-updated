const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

const docusignClient = axios.create({
  baseURL: `https://${process.env.DOCUSIGN_ACCOUNT_ID}.docusign.net/restapi`,
  timeout: 10000
});

// Helper to get access token
const getDocuSignToken = async () => {
  try {
    const response = await axios.post(
      'https://account-d.docusign.com/oauth/token',
      {
        grant_type: 'client_credentials',
        client_id: process.env.DOCUSIGN_INTEGRATION_KEY,
        client_secret: process.env.DOCUSIGN_USER_ID,
        scope: 'signature'
      },
      { timeout: 5000 }
    );
    return response.data.access_token;
  } catch (err) {
    console.error('DocuSign token error:', err);
    throw err;
  }
};

// Send envelope
router.post('/send-envelope', auth, authorize('admin', 'sales_rep'), asyncHandler(async (req, res) => {
  const { merchant_id, deal_id, application_id, document_name, signer_email, signer_name } = req.body;

  if (!merchant_id || !signer_email || !signer_name) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const token = await getDocuSignToken();

    const envelopeDefinition = {
      emailSubject: `Please sign: ${document_name}`,
      documents: [{
        documentBase64: Buffer.from('SAMPLE_DOCUMENT_CONTENT').toString('base64'),
        name: document_name,
        fileExtension: 'pdf',
        documentId: '1'
      }],
      recipients: {
        signers: [{
          email: signer_email,
          name: signer_name,
          recipientId: '1',
          routingOrder: '1'
        }]
      },
      status: 'sent'
    };

    const response = await docusignClient.post(
      '/v2.1/accounts/{accountId}/envelopes',
      envelopeDefinition,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const envelopeId = response.data.envelopeId;

    // Store envelope record
    const result = await query(
      `INSERT INTO docusign_envelopes (
        envelope_id, merchant_id, deal_id, application_id,
        document_name, status, sent_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [envelopeId, merchant_id, deal_id, application_id, document_name, 'sent']
    );

    res.status(201).json({
      message: 'Envelope sent successfully',
      envelope_id: envelopeId,
      record: result.rows[0]
    });
  } catch (err) {
    console.error('Send envelope error:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to send envelope' });
  }
}));

// Webhook endpoint for envelope status updates
router.post('/webhook', asyncHandler(async (req, res) => {
  try {
    // Verify webhook signature (simplified - in production, implement full verification)
    const signature = req.headers['x-docusign-signature'];
    
    // Parse envelope events
    const events = req.body;

    for (const event of events) {
      if (event.xml) {
        const parser = require('xml2js');
        const xmlParser = new parser.Parser();
        const data = await xmlParser.parseStringPromise(event.xml);
        
        const envelopeStatus = data.DocuSignEnvelopeInformation?.EnvelopeStatus?.[0];
        if (envelopeStatus) {
          const envelopeId = envelopeStatus.EnvelopeID?.[0];
          const status = envelopeStatus.Status?.[0];
          const completedDateTime = envelopeStatus.Completed?.[0];

          // Update record
          await query(
            `UPDATE docusign_envelopes SET 
             status = $1, 
             completed_date = $2,
             webhook_data = $3,
             updated_at = CURRENT_TIMESTAMP
             WHERE envelope_id = $4`,
            [status, completedDateTime, JSON.stringify(envelopeStatus), envelopeId]
          );
        }
      }
    }

    res.json({ message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
}));

// Get envelope status
router.get('/envelope/:envelope_id', auth, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM docusign_envelopes WHERE envelope_id = $1',
      [req.params.envelope_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Envelope not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get envelope error:', err);
    res.status(500).json({ message: 'Failed to fetch envelope' });
  }
}));

module.exports = router;
