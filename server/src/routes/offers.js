const express = require('express');
const { query } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Get all offers
router.get('/', auth, asyncHandler(async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM offers WHERE active = true ORDER BY priority_rank DESC, created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get offers error:', err);
    res.status(500).json({ message: 'Failed to fetch offers' });
  }
}));

// Create offer (admin only)
router.post('/', auth, authorize('admin'), asyncHandler(async (req, res) => {
  const {
    offer_name, fund, buy_rate, term, min_revenue, max_revenue,
    min_time_in_business, eligible_industries, lender_name
  } = req.body;

  if (!offer_name || !buy_rate || !term) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await query(
      `INSERT INTO offers (
        offer_name, fund, buy_rate, term, min_revenue, max_revenue,
        min_time_in_business, eligible_industries, lender_name,
        active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        offer_name, fund, buy_rate, term, min_revenue, max_revenue,
        min_time_in_business, eligible_industries || [], lender_name, true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create offer error:', err);
    res.status(500).json({ message: 'Failed to create offer' });
  }
}));

// Match offers for merchant
router.post('/match/:merchant_id', auth, asyncHandler(async (req, res) => {
  const { merchant_id } = req.params;

  try {
    // Get merchant info
    const merchantResult = await query(
      'SELECT annual_revenue, years_in_business, industry FROM merchants WHERE id = $1',
      [merchant_id]
    );

    if (merchantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const merchant = merchantResult.rows[0];

    // Get matching offers
    const result = await query(
      `SELECT * FROM offers 
       WHERE active = true
       AND (min_revenue IS NULL OR annual_revenue >= min_revenue)
       AND (max_revenue IS NULL OR annual_revenue <= max_revenue)
       AND (min_time_in_business IS NULL OR years_in_business >= min_time_in_business)
       AND (eligible_industries IS NULL OR $1 = ANY(eligible_industries) OR array_length(eligible_industries, 1) IS NULL)
       AND (exclude_industries IS NULL OR NOT ($1 = ANY(exclude_industries)))
       ORDER BY priority_rank DESC`,
      [merchant.industry]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Match offers error:', err);
    res.status(500).json({ message: 'Failed to match offers' });
  }
}));

// Update offer (admin only)
router.patch('/:id', auth, authorize('admin'), asyncHandler(async (req, res) => {
  const { active, priority_rank } = req.body;

  try {
    const updates = [];
    const values = [];
    let paramNum = 1;

    if (active !== undefined) {
      updates.push(`active = $${paramNum++}`);
      values.push(active);
    }
    if (priority_rank !== undefined) {
      updates.push(`priority_rank = $${paramNum++}`);
      values.push(priority_rank);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    const result = await query(
      `UPDATE offers SET ${updates.join(', ')} WHERE id = $${paramNum} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Offer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update offer error:', err);
    res.status(500).json({ message: 'Failed to update offer' });
  }
}));

module.exports = router;
