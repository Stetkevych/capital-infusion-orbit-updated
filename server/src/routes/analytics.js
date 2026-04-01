const express = require('express');
const router = express.Router();

// ── Calculated metric helpers ─────────────────────────────────────────────────
function calcMetrics(deals) {
  const total = deals.length;
  const approved = deals.filter(d => ['approved','funded'].includes(d.approval_status?.toLowerCase()));
  const funded = deals.filter(d => d.approval_status?.toLowerCase() === 'funded');
  const totalFundedVol = funded.reduce((s, d) => s + (parseFloat(d.funded_amount) || 0), 0);
  const avgDealSize = funded.length ? totalFundedVol / funded.length : 0;
  const appToApproval = total ? (approved.length / total * 100) : 0;
  const approvalToFunding = approved.length ? (funded.length / approved.length * 100) : 0;

  // Stage durations
  const withDurations = funded.filter(d => d.days_total_to_fund > 0);
  const avgDaysToFund = withDurations.length
    ? withDurations.reduce((s, d) => s + d.days_total_to_fund, 0) / withDurations.length : 0;

  const stageDurations = {
    submitToDocs:       avg(funded, 'days_submit_to_docs'),
    docsToUnderwrite:   avg(funded, 'days_docs_to_underwrite'),
    underwriteToApprove: avg(funded, 'days_underwrite_to_approve'),
    approveToFund:      avg(funded, 'days_approve_to_fund'),
    totalToFund:        avgDaysToFund,
  };

  // Lender breakdown
  const lenderMap = {};
  deals.forEach(d => {
    const l = d.lender_name || 'Unknown';
    if (!lenderMap[l]) lenderMap[l] = { lender: l, submissions: 0, approved: 0, funded: 0, volume: 0 };
    lenderMap[l].submissions++;
    if (['approved','funded'].includes(d.approval_status?.toLowerCase())) lenderMap[l].approved++;
    if (d.approval_status?.toLowerCase() === 'funded') {
      lenderMap[l].funded++;
      lenderMap[l].volume += parseFloat(d.funded_amount) || 0;
    }
  });
  const lenderBreakdown = Object.values(lenderMap).map(l => ({
    ...l,
    fundingRate: l.submissions ? Math.round(l.funded / l.submissions * 100) : 0,
    approvalRate: l.submissions ? Math.round(l.approved / l.submissions * 100) : 0,
  })).sort((a, b) => b.volume - a.volume);

  // Deal size distribution buckets
  const buckets = { '<25K': 0, '25-50K': 0, '50-75K': 0, '75-100K': 0, '100-150K': 0, '150K+': 0 };
  funded.forEach(d => {
    const amt = parseFloat(d.funded_amount) || 0;
    if (amt < 25000) buckets['<25K']++;
    else if (amt < 50000) buckets['25-50K']++;
    else if (amt < 75000) buckets['50-75K']++;
    else if (amt < 100000) buckets['75-100K']++;
    else if (amt < 150000) buckets['100-150K']++;
    else buckets['150K+']++;
  });
  const dealSizeDistribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));

  // Monthly trend
  const monthlyMap = {};
  deals.forEach(d => {
    const month = (d.application_submitted_at || d.created_at || '').substring(0, 7);
    if (!month) return;
    if (!monthlyMap[month]) monthlyMap[month] = { month, submitted: 0, approved: 0, funded: 0, volume: 0 };
    monthlyMap[month].submitted++;
    if (['approved','funded'].includes(d.approval_status?.toLowerCase())) monthlyMap[month].approved++;
    if (d.approval_status?.toLowerCase() === 'funded') {
      monthlyMap[month].funded++;
      monthlyMap[month].volume += parseFloat(d.funded_amount) || 0;
    }
  });
  const monthlyTrend = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));

  // Pipeline by stage
  const stageMap = {};
  deals.forEach(d => {
    const s = d.stage || 'Unknown';
    if (!stageMap[s]) stageMap[s] = { stage: s, count: 0, value: 0 };
    stageMap[s].count++;
    stageMap[s].value += parseFloat(d.requested_amount) || 0;
  });

  // Debt/risk metrics
  const withDebt = deals.filter(d => d.daily_payment_obligation > 0);
  const avgDailyObligation = withDebt.length ? avg(withDebt, 'daily_payment_obligation') : 0;
  const avgWithholding = withDebt.length ? avg(withDebt, 'withholding_percentage') : 0;

  // MTD counts
  const now = new Date();
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const mtdDeals = deals.filter(d => (d.application_submitted_at || d.created_at) >= mtdStart);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayDeals = deals.filter(d => (d.application_submitted_at || d.created_at) >= todayStart);

  return {
    summary: {
      totalApps: total,
      mtdApps: mtdDeals.length,
      todayApps: todayDeals.length,
      approvedCount: approved.length,
      fundedCount: funded.length,
      appToApprovalRatio: Math.round(appToApproval * 10) / 10,
      approvalToFundingRatio: Math.round(approvalToFunding * 10) / 10,
      totalFundedVolume: Math.round(totalFundedVol),
      avgDealSize: Math.round(avgDealSize),
      avgDaysToFund: Math.round(avgDaysToFund * 10) / 10,
      avgDailyObligation: Math.round(avgDailyObligation),
      avgWithholdingPct: Math.round(avgWithholding * 10) / 10,
    },
    stageDurations,
    lenderBreakdown,
    dealSizeDistribution,
    monthlyTrend,
    pipelineByStage: Object.values(stageMap),
    deals: deals.slice(0, 50),
  };
}

function avg(arr, key) {
  const vals = arr.map(d => parseFloat(d[key])).filter(v => v > 0);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role === 'client') return res.status(403).json({ error: 'Access denied' });

    const DealStore = require('../services/dealStore');
    const isAdmin = user.role === 'admin';
    const repId = isAdmin ? null : (user.rep_id || user.repId || user.id);

    let deals = isAdmin ? await DealStore.getAll() : await DealStore.getByRep(repId);

    // Apply filters from query params
    if (req.query.rep && isAdmin) deals = deals.filter(d => d.rep_id === req.query.rep);
    if (req.query.lender) deals = deals.filter(d => d.lender_name === req.query.lender);
    if (req.query.from) deals = deals.filter(d => (d.application_submitted_at || d.created_at) >= req.query.from);
    if (req.query.to) deals = deals.filter(d => (d.application_submitted_at || d.created_at) <= req.query.to);

    const metrics = calcMetrics(deals);

    // Rep comparison for admin
    if (isAdmin) {
      const allDeals = await DealStore.getAll();
      const repMap = {};
      allDeals.forEach(d => {
        if (!repMap[d.rep_id]) repMap[d.rep_id] = { rep_id: d.rep_id, rep_name: d.rep_name, deals: [] };
        repMap[d.rep_id].deals.push(d);
      });
      metrics.repComparison = Object.values(repMap).map(r => {
        const m = calcMetrics(r.deals);
        return { rep_id: r.rep_id, rep_name: r.rep_name, ...m.summary };
      });
    }

    res.json({ ...metrics, source: 'live' });
  } catch (err) {
    console.error('[Analytics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/underwriting ──────────────────────────────────────────
router.get('/underwriting', async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role === 'client') return res.status(403).json({ error: 'Access denied' });

    const DealStore = require('../services/dealStore');
    const isAdmin = user.role === 'admin';
    const repId = isAdmin ? null : (user.rep_id || user.repId || user.id);
    const deals = isAdmin ? await DealStore.getAll() : await DealStore.getByRep(repId);

    const withUW = deals.filter(d => d.avg_monthly_revenue || d.nsf_count !== undefined);
    res.json({
      avgMonthlyRevenue: Math.round(avg(withUW, 'avg_monthly_revenue')),
      avgTrueRevenue: Math.round(avg(withUW, 'true_revenue')),
      avgNsfCount: Math.round(avg(withUW, 'nsf_count') * 10) / 10,
      avgNegativeDays: Math.round(avg(withUW, 'negative_days') * 10) / 10,
      avgDailyBalance: Math.round(avg(withUW, 'avg_daily_balance')),
      avgDebtBurdenRatio: Math.round(avg(withUW, 'debt_burden_ratio') * 100) / 100,
      count: withUW.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
