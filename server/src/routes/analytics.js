const express = require('express');
const router = express.Router();

// ── Mock data for when Athena isn't populated yet ─────────────────────────────
function getMockAnalytics(repId, isAdmin) {
  const repFilter = isAdmin ? null : repId;

  const allDeals = [
    { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', lender: 'Libertas', status: 'funded', amount: 75000, factor: 1.35, submitted: '2026-01-15', funded: '2026-01-22', industry: 'Retail', stage: 'Funded' },
    { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', lender: 'Libertas', status: 'funded', amount: 50000, factor: 1.28, submitted: '2026-02-01', funded: '2026-02-08', industry: 'Food', stage: 'Funded' },
    { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', lender: 'Kapitus', status: 'approved', amount: 120000, factor: 1.42, submitted: '2026-02-20', funded: null, industry: 'Construction', stage: 'Approved' },
    { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', lender: 'Kapitus', status: 'declined', amount: 80000, factor: null, submitted: '2026-03-01', funded: null, industry: 'Auto', stage: 'Declined' },
    { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', lender: 'Greenbox', status: 'funded', amount: 95000, factor: 1.38, submitted: '2026-03-10', funded: '2026-03-18', industry: 'Healthcare', stage: 'Funded' },
    { rep_id: 'r-nik', rep_name: 'Nikholas Lazo', lender: 'Greenbox', status: 'submitted', amount: 60000, factor: null, submitted: '2026-03-25', funded: null, industry: 'Retail', stage: 'Submitted' },
    { rep_id: 'r1', rep_name: 'Sarah Mitchell', lender: 'Libertas', status: 'funded', amount: 45000, factor: 1.29, submitted: '2026-01-10', funded: '2026-01-17', industry: 'Food', stage: 'Funded' },
    { rep_id: 'r1', rep_name: 'Sarah Mitchell', lender: 'Kapitus', status: 'funded', amount: 88000, factor: 1.35, submitted: '2026-02-15', funded: '2026-02-22', industry: 'Retail', stage: 'Funded' },
    { rep_id: 'r2', rep_name: 'James Carter', lender: 'Greenbox', status: 'funded', amount: 110000, factor: 1.40, submitted: '2026-01-20', funded: '2026-01-28', industry: 'Construction', stage: 'Funded' },
  ];

  const deals = repFilter ? allDeals.filter(d => d.rep_id === repFilter) : allDeals;

  const funded = deals.filter(d => d.status === 'funded');
  const submitted = deals.filter(d => ['submitted','approved','funded','declined'].includes(d.status));
  const approved = deals.filter(d => ['approved','funded'].includes(d.status));
  const pipeline = deals.filter(d => ['submitted','approved'].includes(d.status));

  const totalFunded = funded.reduce((s, d) => s + d.amount, 0);
  const avgDealSize = funded.length ? totalFunded / funded.length : 0;
  const approvalRate = submitted.length ? (approved.length / submitted.length * 100) : 0;
  const fundingRate = submitted.length ? (funded.length / submitted.length * 100) : 0;

  // Monthly trend
  const monthlyMap = {};
  deals.forEach(d => {
    const month = d.submitted.substring(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { month, submitted: 0, approved: 0, funded: 0, volume: 0 };
    monthlyMap[month].submitted++;
    if (['approved','funded'].includes(d.status)) monthlyMap[month].approved++;
    if (d.status === 'funded') { monthlyMap[month].funded++; monthlyMap[month].volume += d.amount; }
  });
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // Lender breakdown
  const lenderMap = {};
  deals.forEach(d => {
    if (!lenderMap[d.lender]) lenderMap[d.lender] = { lender: d.lender, submissions: 0, approvals: 0, funded: 0, volume: 0, rates: [] };
    lenderMap[d.lender].submissions++;
    if (['approved','funded'].includes(d.status)) lenderMap[d.lender].approvals++;
    if (d.status === 'funded') { lenderMap[d.lender].funded++; lenderMap[d.lender].volume += d.amount; if (d.factor) lenderMap[d.lender].rates.push(d.factor); }
  });
  const lenderBreakdown = Object.values(lenderMap).map(l => ({
    ...l,
    approvalRate: l.submissions ? Math.round(l.approvals / l.submissions * 100) : 0,
    avgFactor: l.rates.length ? (l.rates.reduce((s, r) => s + r, 0) / l.rates.length).toFixed(2) : null,
  })).sort((a, b) => b.volume - a.volume);

  // Pipeline by stage
  const stageMap = {};
  pipeline.forEach(d => {
    if (!stageMap[d.stage]) stageMap[d.stage] = { stage: d.stage, count: 0, value: 0 };
    stageMap[d.stage].count++;
    stageMap[d.stage].value += d.amount;
  });

  // Rep comparison (admin only)
  const repMap = {};
  allDeals.forEach(d => {
    if (!repMap[d.rep_id]) repMap[d.rep_id] = { rep_id: d.rep_id, rep_name: d.rep_name, funded: 0, volume: 0, submitted: 0 };
    repMap[d.rep_id].submitted++;
    if (d.status === 'funded') { repMap[d.rep_id].funded++; repMap[d.rep_id].volume += d.amount; }
  });

  return {
    summary: {
      totalFunded: Math.round(totalFunded),
      totalFundedDeals: funded.length,
      avgDealSize: Math.round(avgDealSize),
      approvalRate: Math.round(approvalRate),
      fundingRate: Math.round(fundingRate),
      activePipeline: pipeline.length,
      pipelineValue: pipeline.reduce((s, d) => s + d.amount, 0),
      totalDeals: deals.length,
    },
    monthlyTrend,
    lenderBreakdown,
    pipelineByStage: Object.values(stageMap),
    repComparison: isAdmin ? Object.values(repMap) : null,
    deals: deals.slice(0, 20),
  };
}

// ── Middleware: enforce rep scoping ───────────────────────────────────────────
function getRepScope(user) {
  if (user.role === 'admin') return null; // admin sees all
  return user.repId || user.rep_id || user.id;
}

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === 'client') return res.status(403).json({ error: 'Access denied' });

    const repId = getRepScope(user);
    const isAdmin = user.role === 'admin';

    // Try Athena first, fall back to mock
    try {
      const { runQuery } = require('../services/athenaService');
      const repFilter = repId ? `WHERE rep_id = '${repId}'` : '';

      const [summary, monthly, lenders, pipeline] = await Promise.all([
        runQuery(`SELECT * FROM rep_production_summary ${repFilter}`),
        runQuery(`SELECT * FROM monthly_production ${repFilter} ORDER BY year DESC, month DESC LIMIT 12`),
        runQuery(`SELECT * FROM lender_performance_by_rep ${repFilter} ORDER BY total_funded DESC`),
        runQuery(`SELECT * FROM pipeline_by_stage ${repFilter}`),
      ]);

      return res.json({ summary, monthly, lenders, pipeline, source: 'athena' });
    } catch (athenaErr) {
      console.log('[Analytics] Athena unavailable, using mock data:', athenaErr.message);
      const data = getMockAnalytics(repId, isAdmin);
      return res.json({ ...data, source: 'mock' });
    }
  } catch (err) {
    console.error('[Analytics] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/lenders ────────────────────────────────────────────────
router.get('/lenders', async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role === 'client') return res.status(403).json({ error: 'Access denied' });
    const repId = getRepScope(user);
    const isAdmin = user.role === 'admin';
    const data = getMockAnalytics(repId, isAdmin);
    res.json({ lenders: data.lenderBreakdown, source: 'mock' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/reps (admin only) ──────────────────────────────────────
router.get('/reps', async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const data = getMockAnalytics(null, true);
    res.json({ reps: data.repComparison, source: 'mock' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
