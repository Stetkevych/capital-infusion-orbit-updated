const express = require('express');
const { query } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Dashboard summary
router.get('/summary', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const [
      applicationsResult,
      dealsResult,
      activeDealsResult,
      merchantsResult,
      paymentsResult
    ] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted,
          COUNT(CASE WHEN status = 'underwriting' THEN 1 END) as underwriting,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
        FROM applications
      `),
      query(`
        SELECT 
          COUNT(*) as total_deals,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'paid_off' THEN 1 ELSE 0 END) as paid_off,
          SUM(funding_amount) as total_funded
        FROM deals
      `),
      query(`
        SELECT 
          SUM(current_balance) as active_balance,
          SUM(total_collected) as total_collected,
          AVG(collection_rate) as avg_collection_rate
        FROM deals
        WHERE status = 'active'
      `),
      query('SELECT COUNT(*) as total FROM merchants WHERE status = $1', ['active']),
      query(`
        SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) as cleared,
          SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounced,
          SUM(actual_amount) as total_amount_collected
        FROM payments
      `)
    ]);

    res.json({
      applications: applicationsResult.rows[0],
      deals: dealsResult.rows[0],
      active_deals: activeDealsResult.rows[0],
      merchants: merchantsResult.rows[0],
      payments: paymentsResult.rows[0]
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
}));

// Application status breakdown
router.get('/applications-by-status', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Applications by status error:', err);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
}));

// Revenue by industry
router.get('/revenue-by-industry', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        industry,
        COUNT(*) as deal_count,
        SUM(funding_amount) as total_funded,
        AVG(factor_rate) as avg_factor_rate
      FROM deals
      WHERE industry IS NOT NULL
      GROUP BY industry
      ORDER BY total_funded DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Revenue by industry error:', err);
    res.status(500).json({ message: 'Failed to fetch revenue data' });
  }
}));

// Payment trends
router.get('/payment-trends', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        DATE(payment_date) as date,
        COUNT(*) as total_payments,
        SUM(actual_amount) as total_amount,
        COUNT(CASE WHEN status = 'cleared' THEN 1 END) as cleared,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced
      FROM payments
      WHERE payment_date >= NOW() - INTERVAL '90 days'
      GROUP BY DATE(payment_date)
      ORDER BY date DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Payment trends error:', err);
    res.status(500).json({ message: 'Failed to fetch payment trends' });
  }
}));

// Deal performance
router.get('/deal-performance', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        id,
        merchant_name,
        funding_amount,
        total_collected,
        current_balance,
        ROUND((total_collected / NULLIF(funding_amount, 0) * 100)::numeric, 2) as collection_percent,
        status,
        last_payment_date,
        nsf_count,
        bounce_count
      FROM deals
      ORDER BY last_payment_date DESC NULLS LAST
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Deal performance error:', err);
    res.status(500).json({ message: 'Failed to fetch deal performance' });
  }
}));

// Audit logs
router.get('/audit-logs', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await query(`
      SELECT 
        al.*,
        u.email as user_email,
        u.full_name as user_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json(result.rows);
  } catch (err) {
    console.error('Audit logs error:', err);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
}));

module.exports = router;
