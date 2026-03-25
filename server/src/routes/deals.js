const express = require('express');
const { query } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Create deal
router.post('/', auth, authorize('admin', 'sales_rep'), asyncHandler(async (req, res) => {
  const {
    merchant_id, application_id, funder_name, funding_amount, 
    factor_rate, payback_amount, term_length, funded_date
  } = req.body;

  if (!merchant_id || !funding_amount || !factor_rate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Get merchant info
    const merchantResult = await query(
      'SELECT legal_name FROM merchants WHERE id = $1',
      [merchant_id]
    );

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const merchant = merchantResult.rows[0];
    const daily_payment = funding_amount / term_length;

    const result = await query(
      `INSERT INTO deals (
        merchant_id, merchant_name, application_id, funder_name,
        funding_amount, factor_rate, payback_amount, term_length,
        daily_payment, weekly_payment, funded_date, status,
        payments_remaining, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        merchant_id, merchant.legal_name, application_id, funder_name,
        funding_amount, factor_rate, payback_amount, term_length,
        daily_payment, daily_payment * 7, funded_date, 'active',
        term_length
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create deal error:', err);
    res.status(500).json({ message: 'Failed to create deal' });
  }
}));

// Get all deals
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    const { status, merchant_id } = req.query;
    let sql = 'SELECT * FROM deals';
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (merchant_id) {
      conditions.push(`merchant_id = $${params.length + 1}`);
      params.push(merchant_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY funded_date DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get deals error:', err);
    res.status(500).json({ message: 'Failed to fetch deals' });
  }
}));

// Get deal by ID
router.get('/:id', auth, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM deals WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get deal error:', err);
    res.status(500).json({ message: 'Failed to fetch deal' });
  }
}));

// Update deal
router.patch('/:id', auth, authorize('admin', 'sales_rep'), asyncHandler(async (req, res) => {
  const {
    status, current_balance, total_collected, payments_made,
    last_payment_date, nsf_count, bounce_count
  } = req.body;

  try {
    const dealResult = await query(
      'SELECT * FROM deals WHERE id = $1',
      [req.params.id]
    );

    if (dealResult.rows.length === 0) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    const updates = [];
    const values = [];
    let paramNum = 1;

    if (status) {
      updates.push(`status = $${paramNum++}`);
      values.push(status);
    }
    if (current_balance !== undefined) {
      updates.push(`current_balance = $${paramNum++}`);
      values.push(current_balance);
    }
    if (total_collected !== undefined) {
      updates.push(`total_collected = $${paramNum++}`);
      values.push(total_collected);
    }
    if (payments_made !== undefined) {
      updates.push(`payments_made = $${paramNum++}`);
      values.push(payments_made);
    }
    if (last_payment_date !== undefined) {
      updates.push(`last_payment_date = $${paramNum++}`);
      values.push(last_payment_date);
    }
    if (nsf_count !== undefined) {
      updates.push(`nsf_count = $${paramNum++}`);
      values.push(nsf_count);
    }
    if (bounce_count !== undefined) {
      updates.push(`bounce_count = $${paramNum++}`);
      values.push(bounce_count);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const result = await query(
      `UPDATE deals SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update deal error:', err);
    res.status(500).json({ message: 'Failed to update deal' });
  }
}));

module.exports = router;
