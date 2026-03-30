const express = require('express');
const router = express.Router();
const { getPresignedUploadUrl, getPresignedDownloadUrl, fileExists, deleteFile } = require('../services/s3Service');
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
    };

    const docs = loadDocs();
    docs.push(doc);
    saveDocs(docs);

    res.json({ doc });
  } catch (err) {
    console.error('[S3] Confirm error:', err.message);
    res.status(500).json({ error: err.message });
  }
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
