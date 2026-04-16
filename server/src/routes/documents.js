const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { getPresignedUploadUrl, getPresignedDownloadUrl, fileExists, deleteFile } = require('../services/s3Service');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

// Safe OCR import — uploads NEVER fail because of OCR issues
let extractBankStatement, extractRawLines;
try {
  const ocr = require('../services/textractService');
  extractBankStatement = ocr.extractBankStatement;
  extractRawLines = ocr.extractRawLines;
  console.log('[Documents] Textract OCR loaded');
} catch (e) {
  console.error('[Documents] OCR failed to load:', e.message);
  extractBankStatement = async () => ({ success: false, error: 'OCR unavailable' });
  extractRawLines = async () => ({ success: false, error: 'OCR unavailable' });
}
const EventLogger = require('../services/eventLogger');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AWS_S3_BUCKET || 'orbit-documents-882611632216-882611632216-us-east-1-an';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const DOC_FILE = 'documents.json';
async function loadDocs() { return await loadFromS3(DOC_FILE); }
async function saveDocs(docs) { await saveToS3(DOC_FILE, docs); }

// ─── POST /api/documents/presign ──────────────────────────────────────────────
router.post('/presign', async (req, res) => {
  try {
    const { clientId, category, fileName, contentType } = req.body;
    if (!clientId || !category || !fileName) {
      return res.status(400).json({ error: 'clientId, category, fileName required' });
    }
    const { url, key } = await getPresignedUploadUrl({ clientId, category, fileName, contentType });
    res.json({ url, key });
  } catch (err) {
    console.error('[S3] Presign error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/documents/upload ───────────────────────────────────────────────
// Direct server-side upload — no presigned URL needed
router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    const { clientId, category, uploadedBy } = req.body;
    if (!clientId || !category || !req.files?.length) {
      return res.status(400).json({ error: 'clientId, category, and files required' });
    }

    const docs = await loadDocs();
    const results = [];

    for (const file of req.files) {
      const key = `clients/${clientId}/${category}/${uuidv4()}_${file.originalname}`;

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || 'application/octet-stream',
      }));

      const doc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        key, clientId, category,
        fileName: file.originalname,
        fileSize: file.size >= 102400 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
        uploadedBy: uploadedBy || 'unknown',
        bankAccount: (category === 'bank_statements' && req.body.bankAccount) ? req.body.bankAccount : null,
        uploadedAt: new Date().toISOString(),
        status: 'Uploaded', visibility: 'all', tags: [], note: '',
        extractedFinancials: null,
        extractionStatus: category === 'bank_statements' ? 'pending' : 'n/a',
      };

      docs.push(doc);
      results.push(doc);

      // Fire-and-forget OCR for bank statements
      if (category === 'bank_statements') {
        const docId = doc.id;
        extractBankStatement(key).then(async (financials) => {
          try {
            const allDocs = await loadDocs();
            const idx = allDocs.findIndex(d => d.id === docId);
            if (idx !== -1) {
              allDocs[idx].extractedFinancials = financials;
              allDocs[idx].extractionStatus = financials.success ? 'complete' : 'failed';
              await saveDocs(allDocs);
              console.log(`[OCR] ${file.originalname}: ${financials.success ? 'success' : financials.error}`);
            }
          } catch (e) { console.error('[OCR] Save error:', e.message); }
        }).catch(err => console.error('[OCR] Error:', err.message));
      }

      console.log(`[Upload] ${file.originalname} → ${key} (${doc.fileSize})`);
    }

    await saveDocs(docs);
    res.json({ uploaded: results.length, docs: results });

    // Activity log (client uploads only) + Rep email (all uploads)
    try {
      const UserStore = require('../services/userStore');
      const ClientStore = require('../services/clientStore');
      const uploader = uploadedBy ? await UserStore.findById(uploadedBy) : null;

      // Activity log — client uploads only
      if (uploader && uploader.role === 'client') {
        const { logActivity } = require('./activity');
        for (const doc of results) {
          await logActivity({ eventType: 'upload', clientId, fileName: doc.fileName, category, uploadedBy, description: `Client uploaded: ${doc.fileName} (${category})` });
        }
      }

      // Email rep when stipulations uploaded (skip applications - DocuSign handles those)
      const client = await ClientStore.getById(clientId);
      if (client && client.assignedRepId && category !== 'application') {
        const rep = await UserStore.findById(client.assignedRepId);
        if (rep && rep.email) {
          const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
          const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const FROM = process.env.FROM_EMAIL || 'noreply@orbit-technology.com';
          const fileNames = results.map(d => d.fileName).join(', ');
          const uploaderName = uploader ? uploader.full_name : 'Someone';
          console.log(`[Email] Sending rep notification to ${rep.email} from ${FROM}`);
          await ses.send(new SendEmailCommand({
            Source: `Capital Infusion <${FROM}>`,
            Destination: { ToAddresses: [rep.email] },
            Message: {
              Subject: { Data: `New Upload: ${client.businessName || client.ownerName}` },
              Body: {
                Html: { Data: '<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px"><h2 style="color:#1d1d1f">New Document Upload</h2><p style="color:#424245"><strong>' + uploaderName + '</strong> uploaded documents for <strong>' + (client.ownerName || client.businessName) + '</strong>:</p><div style="background:#f5f5f7;border-radius:12px;padding:16px;margin:16px 0"><p style="margin:4px 0;color:#424245"><strong>Files:</strong> ' + fileNames + '</p><p style="margin:4px 0;color:#424245"><strong>Category:</strong> ' + category + '</p></div><p style="color:#424245"><a href="https://orbit-technology.com/clients/' + clientId + '">View in Orbit</a></p><p style="color:#86868b;font-size:12px;margin-top:24px">Capital Infusion - Orbit Platform</p></div>' },
                Text: { Data: uploaderName + ' uploaded ' + fileNames + ' (' + category + ') for ' + (client.ownerName || '') + '. View: https://orbit-technology.com/clients/' + clientId },
              },
            },
          }));
          console.log(`[Email] Rep ${rep.email} notified about upload for ${client.ownerName}`);
        }
      }
    } catch (e) { console.error('[Upload] Activity/notify error:', e.message); }
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/documents/confirm ──────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  try {
    const { key, clientId, repId, category, fileName, fileSize, uploadedBy, visibility = 'all' } = req.body;
    const exists = await fileExists(key);
    if (!exists) return res.status(400).json({ error: 'File not found in S3' });

    const doc = {
      id: `doc_${Date.now()}`,
      key, clientId, repId, category, fileName, fileSize, uploadedBy,
      uploadedAt: new Date().toISOString(),
      status: 'Uploaded', visibility, tags: [], note: '',
      extractedFinancials: null,
      extractionStatus: category === 'bank_statements' ? 'pending' : 'n/a',
    };

    const docs = await loadDocs();
    docs.push(doc);
    await saveDocs(docs);

    EventLogger.upload({
      upload_id: doc.id, client_id: clientId, rep_id: repId, category,
      file_name: fileName, file_size_mb: parseFloat(fileSize) || 0,
      status: 'Uploaded', uploaded_at: doc.uploadedAt,
    });

    res.json({ doc });

    // Log activity only for client uploads
    try {
      const UserStore = require('../services/userStore');
      const uploader = uploadedBy ? await UserStore.findById(uploadedBy) : null;
      if (uploader && uploader.role === 'client') {
        const { logActivity } = require('./activity');
        await logActivity({ eventType: 'upload', clientId, fileName, category, uploadedBy, description: `Client uploaded: ${fileName} (${category})` });
      }
    } catch {}
  } catch (err) {
    console.error('[S3] Confirm error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/documents/financials/:clientId ──────────────────────────────────
router.get('/financials/:clientId', async (req, res) => {
  try {
    const allDocs = await loadDocs();
    const accountFilter = req.query.account || null;
    const docs = allDocs.filter(
      d => d.clientId === req.params.clientId && d.category === 'bank_statements' && d.extractedFinancials?.success
        && (!accountFilter || d.bankAccount === accountFilter)
    );
    if (docs.length === 0) return res.json({ available: false, monthsCovered: 0, docs: [] });

    const allFinancials = docs.map(d => d.extractedFinancials);
    const totalMonths = allFinancials.reduce((sum, f) => sum + (f.monthsCovered || 1), 0);
    const totalCredits = allFinancials.reduce((sum, f) => sum + (f.totalCredits || 0), 0);
    const totalDepositCount = allFinancials.reduce((sum, f) => sum + (f.numberOfDeposits || 0), 0);
    const maxNegDays = Math.max(...allFinancials.map(f => f.negativeDays || 0));
    const avgMonthlyRevenue = totalMonths > 0 && totalCredits > 0 ? Math.round(totalCredits / totalMonths) : null;
    const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

    const mergedPositions = {};
    allFinancials.forEach(f => {
      (f.positions || []).forEach(p => {
        if (!mergedPositions[p.name]) mergedPositions[p.name] = { name: p.name, totalPaid: 0, occurrences: 0 };
        mergedPositions[p.name].totalPaid += p.totalPaid || 0;
        mergedPositions[p.name].occurrences += p.occurrences || 0;
      });
    });
    const positions = Object.values(mergedPositions);
    const totalLenderPayments = positions.reduce((sum, p) => sum + p.totalPaid, 0);
    const withholdingRate = avgMonthlyRevenue && totalLenderPayments > 0
      ? parseFloat((totalLenderPayments / avgMonthlyRevenue * 100).toFixed(1)) : 0;

    // Payment frequency — use most common across docs
    const freqCounts = {};
    allFinancials.forEach(f => {
      if (f.paymentFrequency && f.paymentFrequency !== 'Unknown') {
        freqCounts[f.paymentFrequency] = (freqCounts[f.paymentFrequency] || 0) + 1;
      }
    });
    const paymentFrequency = Object.entries(freqCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    const pendingDocs = allDocs.filter(
      d => d.clientId === req.params.clientId && d.category === 'bank_statements' && d.extractionStatus === 'pending'
    ).length;

    res.json({
      available: true, monthsCovered: totalMonths, avgMonthlyRevenue, estimatedAnnualRevenue,
      numberOfDeposits: totalDepositCount, negativeDays: maxNegDays, totalCredits,
      positions, positionCount: positions.length, totalLenderPayments: Math.round(totalLenderPayments),
      withholdingRate, docsProcessed: docs.length, pendingDocs, paymentFrequency,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/documents/client/all ────────────────────────────────────────
router.get('/client/all', async (req, res) => {
  try {
    const docs = await loadDocs();
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/documents/client/:clientId ──────────────────────────────────────
router.get('/client/:clientId', async (req, res) => {
  try {
    const docs = (await loadDocs()).filter(d => d.clientId === req.params.clientId);
    res.json(docs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/documents/download/:id ──────────────────────────────────────────
router.get('/download/:id', async (req, res) => {
  try {
    const docs = await loadDocs();
    const doc = docs.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const url = await getPresignedDownloadUrl(doc.key);
    res.json({ url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /api/documents/:id/status ──────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const docs = await loadDocs();
    const idx = docs.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    docs[idx].status = req.body.status;
    await saveDocs(docs);
    res.json(docs[idx]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docs = await loadDocs();
    const idx = docs.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    await deleteFile(docs[idx].key);
    docs.splice(idx, 1);
    await saveDocs(docs);
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/documents/debug-textract/:docId ─────────────────────────────────────
router.get('/debug-textract/:docId', async (req, res) => {
  try {
    const docs = await loadDocs();
    const doc = docs.find(d => d.id === req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doc not found' });
    const result = await extractRawLines(doc.key);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/documents/reprocess/:clientId ─────────────────────────────────
router.post('/reprocess/:clientId', async (req, res) => {
  try {
    const docs = await loadDocs();
    const bankDocs = docs.filter(d => d.clientId === req.params.clientId && d.category === 'bank_statements');
    if (bankDocs.length === 0) return res.json({ reprocessed: 0, message: 'No bank statements found' });
    let count = 0;
    for (const doc of bankDocs) {
      const idx = docs.findIndex(d => d.id === doc.id);
      if (idx === -1) continue;
      docs[idx].extractedFinancials = null;
      docs[idx].extractionStatus = 'pending';
      count++;
      const docId = doc.id;
      extractBankStatement(doc.key).then(async (financials) => {
        try {
          const allDocs = await loadDocs();
          const i = allDocs.findIndex(d => d.id === docId);
          if (i !== -1) {
            allDocs[i].extractedFinancials = financials;
            allDocs[i].extractionStatus = financials.success ? 'complete' : 'failed';
            await saveDocs(allDocs);
          }
        } catch {}
      }).catch(err => console.error(`[Reprocess] Error: ${err.message}`));
    }
    await saveDocs(docs);
    res.json({ reprocessed: count, message: `Re-extracting ${count} bank statements. Check back in 30-60 seconds.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get bank accounts for a client
router.get('/accounts/:clientId', async (req, res) => {
  try {
    const docs = (await loadDocs()).filter(d => d.clientId === req.params.clientId && d.category === 'bank_statements');
    const accounts = [...new Set(docs.map(d => d.bankAccount).filter(Boolean))];
    if (accounts.length === 0 && docs.length > 0) accounts.push('Account 1');
    res.json({ accounts, totalStatements: docs.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
