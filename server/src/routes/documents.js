const express = require('express');
const router = express.Router();
const { getPresignedUploadUrl, getPresignedDownloadUrl, fileExists, deleteFile } = require('../services/s3Service');
const { extractBankStatement } = require('../services/textractService');
const EventLogger = require('../services/eventLogger');
const fs = require('fs');
const path = require('path');

// File-based document registry (swap for DB later)
const REGISTRY_PATH = path.join(__dirname, '../../data/documents.json');
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function loadDocs() {
  try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); } catch { return []; }
}
function saveDocs(docs) { fs.writeFileSync(REGISTRY_PATH, JSON.stringify(docs, null, 2)); }

// ─── GET /api/documents/presign ───────────────────────────────────────────────
// Returns a presigned S3 URL for direct browser-to-S3 upload
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

// ─── POST /api/documents/confirm ─────────────────────────────────────────────
// Called after successful S3 upload to register the document
router.post('/confirm', async (req, res) => {
  try {
    const { key, clientId, repId, category, fileName, fileSize, uploadedBy, visibility = 'all' } = req.body;

    // Verify file actually exists in S3
    const exists = await fileExists(key);
    if (!exists) return res.status(400).json({ error: 'File not found in S3' });

    const doc = {
      id: `doc_${Date.now()}`,
      key,
      clientId,
      repId,
      category,
      fileName,
      fileSize,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      status: 'Uploaded',
      visibility,
      tags: [],
      note: '',
      extractedFinancials: null,
      extractionStatus: category === 'bank_statements' ? 'pending' : 'n/a',
    };

    const docs = loadDocs();
    docs.push(doc);
    saveDocs(docs);

    // Fire Textract async for bank statements — don't block the response
    if (category === 'bank_statements') {
      extractBankStatement(key).then(financials => {
        const allDocs = loadDocs();
        const idx = allDocs.findIndex(d => d.id === doc.id);
        if (idx !== -1) {
          allDocs[idx].extractedFinancials = financials;
          allDocs[idx].extractionStatus = financials.success ? 'complete' : 'failed';
          saveDocs(allDocs);
          console.log(`[Textract] Extraction complete for ${fileName}:`, financials.success ? 'success' : financials.error);
        }
      }).catch(err => console.error('[Textract] Async error:', err.message));
    }

    // Log to S3 for Athena analytics
    EventLogger.upload({
      upload_id: doc.id,
      client_id: clientId,
      rep_id: repId,
      category,
      file_name: fileName,
      file_size_mb: parseFloat(fileSize) || 0,
      status: 'Uploaded',
      uploaded_at: doc.uploadedAt,
    });

    res.json({ doc });
  } catch (err) {
    console.error('[S3] Confirm error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/documents/financials/:clientId ─────────────────────────────────
// Returns aggregated extracted financials across all bank statements for a client
router.get('/financials/:clientId', (req, res) => {
  const docs = loadDocs().filter(
    d => d.clientId === req.params.clientId &&
    d.category === 'bank_statements' &&
    d.extractedFinancials?.success
  );

  if (docs.length === 0) {
    return res.json({ available: false, monthsCovered: 0, docs: [] });
  }

  // Aggregate across all bank statement docs
  const allFinancials = docs.map(d => d.extractedFinancials);
  const totalMonths = allFinancials.reduce((sum, f) => sum + (f.monthsCovered || 1), 0);
  const totalCredits = allFinancials.reduce((sum, f) => sum + (f.totalCredits || 0), 0);
  const totalDepositCount = allFinancials.reduce((sum, f) => sum + (f.numberOfDeposits || 0), 0);
  const maxNegDays = Math.max(...allFinancials.map(f => f.negativeDays || 0));

  // Avg monthly revenue = total credits across all statements / total months
  const avgMonthlyRevenue = totalMonths > 0 && totalCredits > 0
    ? Math.round(totalCredits / totalMonths)
    : null;
  const estimatedAnnualRevenue = avgMonthlyRevenue ? avgMonthlyRevenue * 12 : null;

  // Aggregate lender positions across all statements
  const mergedPositions = {};
  allFinancials.forEach(f => {
    (f.positions || []).forEach(p => {
      if (!mergedPositions[p.name]) {
        mergedPositions[p.name] = { name: p.name, totalPaid: 0, occurrences: 0 };
      }
      mergedPositions[p.name].totalPaid += p.totalPaid || 0;
      mergedPositions[p.name].occurrences += p.occurrences || 0;
    });
  });
  const positions = Object.values(mergedPositions);
  const totalLenderPayments = positions.reduce((sum, p) => sum + p.totalPaid, 0);
  const withholdingRate = avgMonthlyRevenue && totalLenderPayments > 0
    ? parseFloat((totalLenderPayments / avgMonthlyRevenue * 100).toFixed(1))
    : 0;

  res.json({
    available: true,
    monthsCovered: totalMonths,
    avgMonthlyRevenue,
    estimatedAnnualRevenue,
    numberOfDeposits: totalDepositCount,
    negativeDays: maxNegDays,
    totalCredits,
    positions,
    positionCount: positions.length,
    totalLenderPayments: Math.round(totalLenderPayments),
    withholdingRate,
    docsProcessed: docs.length,
    pendingDocs: loadDocs().filter(
      d => d.clientId === req.params.clientId &&
      d.category === 'bank_statements' &&
      d.extractionStatus === 'pending'
    ).length,
  });
});

// ─── GET /api/documents/client/all ────────────────────────────────────────────
router.get('/client/all', (req, res) => {
  const docs = loadDocs();
  res.json(docs);
});

// ─── GET /api/documents/client/:clientId ─────────────────────────────────────
router.get('/client/:clientId', (req, res) => {
  const docs = loadDocs().filter(d => d.clientId === req.params.clientId);
  res.json(docs);
});

// ─── GET /api/documents/download/:id ─────────────────────────────────────────
router.get('/download/:id', async (req, res) => {
  try {
    const docs = loadDocs();
    const doc = docs.find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const url = await getPresignedDownloadUrl(doc.key);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/documents/:id/status ─────────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  const docs = loadDocs();
  const idx = docs.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  docs[idx].status = req.body.status;
  saveDocs(docs);
  res.json(docs[idx]);
});

// ─── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docs = loadDocs();
    const idx = docs.findIndex(d => d.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    await deleteFile(docs[idx].key);
    docs.splice(idx, 1);
    saveDocs(docs);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
