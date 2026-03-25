const express = require('express');
const { query, getPool } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// System health
router.get('/health', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const pool = getPool();
    
    // Test database connection
    const dbTest = await query('SELECT 1');
    const dbHealth = dbTest ? 'healthy' : 'unhealthy';

    // Get pool stats
    const poolSize = pool.totalCount;
    const availableConnections = pool.idleCount;

    // Check uptime
    const uptime = process.uptime();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        status: dbHealth,
        connections: {
          total: poolSize,
          available: availableConnections
        }
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      uptime: {
        seconds: Math.floor(uptime),
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
      }
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}));

// Store metrics
router.post('/', auth, authorize('admin'), asyncHandler(async (req, res) => {
  const { metric_name, metric_value, tags } = req.body;

  if (!metric_name || metric_value === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await query(
      `INSERT INTO system_metrics (metric_name, metric_value, tags, created_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [metric_name, metric_value, JSON.stringify(tags || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Store metrics error:', err);
    res.status(500).json({ message: 'Failed to store metrics' });
  }
}));

// Get metrics
router.get('/', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const { metric_name, hours = 24 } = req.query;

    let sql = `SELECT * FROM system_metrics 
               WHERE created_at >= NOW() - INTERVAL '${hours} hours'`;
    const params = [];

    if (metric_name) {
      sql += ' AND metric_name = $1';
      params.push(metric_name);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get metrics error:', err);
    res.status(500).json({ message: 'Failed to fetch metrics' });
  }
}));

// Portfolio metrics
router.get('/portfolio/metrics', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM portfolio_metrics
      ORDER BY metric_date DESC
      LIMIT 30
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Portfolio metrics error:', err);
    res.status(500).json({ message: 'Failed to fetch portfolio metrics' });
  }
}));

// Calculate and store portfolio metrics
router.post('/portfolio/calculate', auth, authorize('admin'), asyncHandler(async (req, res) => {
  try {
    const statsResult = await query(`
      SELECT 
        SUM(funding_amount) as total_deployed,
        SUM(CASE WHEN status = 'active' THEN funding_amount ELSE 0 END) as total_active,
        SUM(total_collected) as total_collected,
        COUNT(CASE WHEN status = 'defaulted' THEN 1 END) as default_count,
        SUM(CASE WHEN status = 'defaulted' THEN funding_amount ELSE 0 END) as default_amount,
        AVG(factor_rate) as avg_factor_rate
      FROM deals
    `);

    const stats = statsResult.rows[0];
    const roi = (stats.total_deployed > 0) 
      ? ((stats.total_collected - stats.total_deployed) / stats.total_deployed * 100)
      : 0;

    const result = await query(
      `INSERT INTO portfolio_metrics (
        metric_date, total_deployed, total_active, total_collected,
        default_count, default_amount, avg_factor_rate, portfolio_roi,
        created_at
      ) VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        stats.total_deployed,
        stats.total_active,
        stats.total_collected,
        stats.default_count,
        stats.default_amount,
        stats.avg_factor_rate,
        roi
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Calculate portfolio metrics error:', err);
    res.status(500).json({ message: 'Failed to calculate portfolio metrics' });
  }
}));

module.exports = router;
