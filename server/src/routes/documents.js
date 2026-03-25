const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload document
router.post('/upload', auth, upload.single('file'), asyncHandler(async (req, res) => {
  const { merchant_id, application_id, document_type } = req.body;

  if (!req.file || !merchant_id || !document_type) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Verify merchant exists
    const merchantResult = await query(
      'SELECT legal_name FROM merchants WHERE id = $1',
      [merchant_id]
    );

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const merchant = merchantResult.rows[0];
    const fileKey = `documents/${merchant_id}/${uuidv4()}-${req.file.originalname}`;

    // Upload to S3
    const s3Params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ServerSideEncryption: 'AES256'
    };

    await s3.upload(s3Params).promise();

    // Store document record
    const result = await query(
      `INSERT INTO documents (
        file_name, file_url, file_size, document_type,
        merchant_id, merchant_name, application_id, uploaded_by,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        req.file.originalname,
        fileKey,
        req.file.size,
        document_type,
        merchant_id,
        merchant.legal_name,
        application_id,
        req.user.id,
        'pending_review'
      ]
    );

    // Log upload
    await query(
      `INSERT INTO upload_logs (user_id, merchant_id, document_id, file_name, file_size, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [req.user.id, merchant_id, result.rows[0].id, req.file.originalname, req.file.size, 'success']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ message: 'Failed to upload document' });
  }
}));

// Get signed URL for document download
router.get('/:id/download', auth, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM documents WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = result.rows[0];

    // Generate signed URL
    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: doc.file_url,
      Expires: 300 // 5 minutes
    });

    res.json({ signedUrl });
  } catch (err) {
    console.error('Get signed URL error:', err);
    res.status(500).json({ message: 'Failed to generate download URL' });
  }
}));

// Get all documents
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    const { merchant_id, application_id, document_type } = req.query;
    let sql = 'SELECT * FROM documents';
    const params = [];
    const conditions = [];

    if (merchant_id) {
      conditions.push(`merchant_id = $${params.length + 1}`);
      params.push(merchant_id);
    }

    if (application_id) {
      conditions.push(`application_id = $${params.length + 1}`);
      params.push(application_id);
    }

    if (document_type) {
      conditions.push(`document_type = $${params.length + 1}`);
      params.push(document_type);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
}));

// Update document status
router.patch('/:id', auth, asyncHandler(async (req, res) => {
  const { status, au_gold_status, au_gold_results, au_gold_score, au_gold_recommendation } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramNum = 1;

    if (status) {
      updates.push(`status = $${paramNum++}`);
      values.push(status);
    }
    if (au_gold_status) {
      updates.push(`au_gold_status = $${paramNum++}`);
      values.push(au_gold_status);
    }
    if (au_gold_results) {
      updates.push(`au_gold_results = $${paramNum++}`);
      values.push(JSON.stringify(au_gold_results));
    }
    if (au_gold_score) {
      updates.push(`au_gold_score = $${paramNum++}`);
      values.push(au_gold_score);
    }
    if (au_gold_recommendation) {
      updates.push(`au_gold_recommendation = $${paramNum++}`);
      values.push(au_gold_recommendation);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const result = await query(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update document error:', err);
    res.status(500).json({ message: 'Failed to update document' });
  }
}));

module.exports = router;
