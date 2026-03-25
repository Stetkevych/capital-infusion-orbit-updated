const express = require('express');
const { query } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Create application
router.post('/', auth, asyncHandler(async (req, res) => {
  const { merchant_id, amount_requested, business_revenue, industry, years_in_business } = req.body;

  if (!merchant_id || !amount_requested) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Get merchant info
    const merchantResult = await query(
      'SELECT legal_name, owner_email FROM merchants WHERE id = $1',
      [merchant_id]
    );

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const merchant = merchantResult.rows[0];
    const assigned_rep_id = req.user.role === 'sales_rep' ? req.user.id : null;

    const result = await query(
      `INSERT INTO applications (
        merchant_id, merchant_name, merchant_email, 
        amount_requested, business_revenue, industry, 
        years_in_business, assigned_rep_id, status, 
        submitted_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        merchant_id, merchant.legal_name, merchant.owner_email,
        amount_requested, business_revenue, industry,
        years_in_business, assigned_rep_id, 'submitted'
      ]
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [req.user.id, 'CREATE_APPLICATION', 'applications', result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create application error:', err);
    res.status(500).json({ message: 'Failed to create application' });
  }
}));

// Get all applications
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    let sql = 'SELECT * FROM applications';
    const params = [];

    // Sales reps see only their applications
    if (req.user.role === 'sales_rep') {
      sql += ' WHERE assigned_rep_id = $1';
      params.push(req.user.id);
    }

    // Clients see only their own applications
    if (req.user.role === 'client') {
      sql += ` WHERE merchant_id IN (
        SELECT id FROM merchants WHERE owner_email = $1
      )`;
      params.push(req.user.email);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get applications error:', err);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
}));

// Get application by ID
router.get('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM applications WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const application = result.rows[0];

    // Check permissions
    if (req.user.role === 'sales_rep' && application.assigned_rep_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(application);
  } catch (err) {
    console.error('Get application error:', err);
    res.status(500).json({ message: 'Failed to fetch application' });
  }
}));

// Update application
router.patch('/:id', auth, asyncHandler(async (req, res) => {
  const { status, notes, underwriting_notes } = req.body;

  try {
    const appResult = await query(
      'SELECT * FROM applications WHERE id = $1',
      [req.params.id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check permissions
    if (req.user.role === 'sales_rep' && appResult.rows[0].assigned_rep_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updates = [];
    const values = [];
    let paramNum = 1;

    if (status) {
      updates.push(`status = $${paramNum++}`);
      values.push(status);
      if (status === 'approved' || status === 'declined') {
        updates.push(`completed_date = CURRENT_TIMESTAMP`);
      }
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramNum++}`);
      values.push(notes);
    }
    if (underwriting_notes !== undefined) {
      updates.push(`underwriting_notes = $${paramNum++}`);
      values.push(JSON.stringify(underwriting_notes));
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    values.push(req.params.id);

    const result = await query(
      `UPDATE applications SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`,
      values
    );

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [req.user.id, 'UPDATE_APPLICATION', 'applications', result.rows[0].id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update application error:', err);
    res.status(500).json({ message: 'Failed to update application' });
  }
}));

module.exports = router;
