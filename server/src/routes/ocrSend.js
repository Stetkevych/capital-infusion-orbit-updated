const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

router.use(authMiddleware);

const OCR_URL = process.env.OCR_SERVICE_URL || 'https://camera-catwalk-snarl.ngrok-free.dev';
const FILE = 'ocr_jobs.json';

// POST /api/ocr/send — send a bank statement to external OCR with client_id
router.post('/send', multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }).single('file'), async (req, res) => {
  try {
    const clientId = req.body.clientId || req.body.client_id;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });
    if (!req.file) return res.status(400).json({ error: 'file required' });

    // Send to external OCR
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });

    const ocrRes = await axios.post(`${OCR_URL}/api/upload`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      timeout: 60000,
    });

    const statementId = ocrRes.data?.statement_id || ocrRes.data?.id;
    if (!statementId) return res.status(500).json({ error: 'OCR did not return statement_id', raw: ocrRes.data });

    // Save mapping
    const jobs = await loadFromS3(FILE).catch(() => []);
    jobs.unshift({
      statementId,
      clientId,
      fileName: req.file.originalname,
      sentAt: new Date().toISOString(),
      sentBy: req.user?.id,
      status: 'processing',
      pushed: false,
    });
    await saveToS3(FILE, jobs);

    res.json({ success: true, statementId, clientId, message: 'Sent to OCR. Will auto-push when complete.' });
  } catch (e) {
    console.error('[OCR Send]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ocr/push — trigger push from OCR back to Orbit for a given statement
router.post('/push', async (req, res) => {
  try {
    const { statementId, clientId } = req.body;
    let cid = clientId;

    // If no clientId provided, look up from jobs
    if (!cid && statementId) {
      const jobs = await loadFromS3(FILE).catch(() => []);
      const job = jobs.find(j => j.statementId == statementId);
      if (job) cid = job.clientId;
    }
    if (!cid) return res.status(400).json({ error: 'Could not resolve clientId' });

    // Call OCR's orbit push endpoint
    const pushRes = await axios.post(`${OCR_URL}/api/orbit/push/${statementId}?client_id=${encodeURIComponent(cid)}`);

    // Mark job as pushed
    const jobs = await loadFromS3(FILE).catch(() => []);
    const idx = jobs.findIndex(j => j.statementId == statementId);
    if (idx >= 0) { jobs[idx].pushed = true; jobs[idx].pushedAt = new Date().toISOString(); jobs[idx].status = 'completed'; await saveToS3(FILE, jobs); }

    res.json({ success: true, statementId, clientId: cid, ocrResponse: pushRes.data });
  } catch (e) {
    console.error('[OCR Push]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/ocr/jobs — list all OCR jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await loadFromS3(FILE).catch(() => []);
    res.json(jobs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
