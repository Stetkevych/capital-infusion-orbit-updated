const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const { getPresignedUploadUrl, getPresignedDownloadUrl, fileExists, deleteFile } = require('../services/s3Service');
const { extractBankStatement } = require('../services/textractService');
const { loadFromS3, saveToS3 } = require('../services/s3Store');
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
        fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedBy: uploadedBy || 'unknown',
        uploadedAt: new Date().toISOString(),
        status: 'Uploaded', visibility: 'all', tags: [], note: '',
        extractedFinancials: null,
        extractionStatus: category === 'bank_statements' ? 'pending' : 'n/a',
      };

      docs.push(doc);
      results.push(doc);

      if (category === 'bank_statements') {
        const docId = doc.id;
        extractBankStatement(key).then(async (financials) => {
          const allDocs = await loadDocs();
          const idx = allDocs.findIndex(d => d.id === docId);
          if (idx !== -1) {
            allDocs[idx].extractedFinancials = financials;
            allDocs[idx].extractionStatus = financials.success ? 'complete' : 'failed';
            await saveDocs(allDocs);
            console.log(`[Textract] Extraction complete for ${file.originalname}:`, financials.success ? 'success' : financials.error);
          }
        }).catch(err => console.error('[Textract] Async error:', err.message));
      }

      console.log(`[Upload] ${file.originalname} → ${key} (${doc.fileSize})`);
    }

    await saveDocs(docs);
    res.json({ uploaded: results.length, docs: results });
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

    if (category === 'bank_statements') {
      extractBankStatement(key).then(async (financials) => {
        const allDocs = await loadDocs();
        const idx = allDocs.findIndex(d => d.id === doc.id);
        if (idx !== -1) {
          allDocs[idx].extractedFinancials = financials;
          allDocs[idx].extractionStatus = financials.success ? 'complete' : 'failed';
          await saveDocs(allDocs);
          console.log(`[Textract] Extraction complete for ${fileName}:`, financials.success ? 'success' : financials.error);
        }
      }).catch(err => console.error('[Textract] Async error:', err.message));
    }

    EventLogger.upload({
      upload_id: doc.id, client_id: clientId, rep_id: repId, category,
      file_name: fileName, file_size_mb: parseFloat(fileSize) || 0,
      status: 'Uploaded', uploaded_at: doc.uploadedAt,
    });

    res.json({ doc });

    // Log to activity feed
    try {
      const { logActivity } = require('./activity');
      await logActivity({ eventType: 'upload', clientId, fileName, category, uploadedBy, description: `Document uploaded: ${fileName} (${category})` });
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
    const docs = allDocs.filter(
      d => d.clientId === req.params.clientId && d.category === 'bank_statements' && d.extractedFinancials?.success
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

    const pendingDocs = allDocs.filter(
      d => d.clientId === req.params.clientId && d.category === 'bank_statements' && d.extractionStatus === 'pending'
    ).length;

    res.json({
      available: true, monthsCovered: totalMonths, avgMonthlyRevenue, estimatedAnnualRevenue,
      numberOfDeposits: totalDepositCount, negativeDays: maxNegDays, totalCredits,
      positions, positionCount: positions.length, totalLenderPayments: Math.round(totalLenderPayments),
      withholdingRate, docsProcessed: docs.length, pendingDocs,
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

module.exports = router;
