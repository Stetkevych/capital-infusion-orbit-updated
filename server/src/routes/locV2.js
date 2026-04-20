const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');

router.use(authMiddleware);

const LOC_FILE = 'loc_accounts_v2.json';
const DRAW_FILE = 'loc_draws_v2.json';
async function loadLoc() { return await loadFromS3(LOC_FILE); }
async function saveLoc(d) { await saveToS3(LOC_FILE, d); }
async function loadDraws() { return await loadFromS3(DRAW_FILE); }
async function saveDraws(d) { await saveToS3(DRAW_FILE, d); }

/**
 * Reamortization logic:
 * - Each draw: payback = amount × factorRate
 * - Installment = payback / totalPayments (monthly or weekly over term)
 * - New draw on existing balance: old deal closes, new deal = remaining payback + new payback
 * - New installment = combined payback / term payments
 * - Balance = total owed (all active payback - all payments made)
 * - Availability = creditLimit - principal drawn (not payback, just draw amounts)
 */

function computeAccount(acct) {
  const draws = (acct.draws || []).filter(d => d.status === 'funded');
  const payments = acct.payments || [];
  const freq = acct.paymentFrequency || 'monthly';
  const termMonths = acct.term || 12;
  const paymentsPerTerm = freq === 'weekly' ? Math.round(termMonths * 4.33) : termMonths;

  // Total principal drawn
  const totalPrincipal = draws.reduce((s, d) => s + d.amount, 0);
  // Total payback owed (with factor)
  const totalPayback = draws.reduce((s, d) => s + (d.paybackAmount || d.amount), 0);
  // Total paid
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  // Balance = what's still owed
  const balance = Math.max(0, totalPayback - totalPaid);
  // Availability = credit limit - principal drawn (not payback)
  const availability = Math.max(0, acct.creditLimit - totalPrincipal);
  // Current installment (reamortized across remaining payments)
  const paidCount = payments.length;
  const remainingPayments = Math.max(1, paymentsPerTerm - paidCount);
  const installmentAmount = balance > 0 ? parseFloat((balance / remainingPayments).toFixed(2)) : 0;

  // Next payment date
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
  const lastDraw = draws.length > 0 ? draws[draws.length - 1] : null;
  const baseDate = lastPayment ? new Date(lastPayment.date) : lastDraw ? new Date(lastDraw.date) : new Date();
  const daysUntilNext = freq === 'weekly' ? 7 : 30;
  const nextPaymentDate = new Date(baseDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);

  return {
    balance, availability, totalPrincipal, totalPayback, totalPaid,
    installmentAmount, remainingPayments, paymentsPerTerm,
    nextPayment: balance > 0 ? { amount: installmentAmount, date: nextPaymentDate.toISOString(), remaining: remainingPayments } : null,
    usagePercent: acct.creditLimit > 0 ? parseFloat(((totalPrincipal / acct.creditLimit) * 100).toFixed(1)) : 0,
  };
}

// ─── GET /accounts ────────────────────────────────────────────────────────────
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await loadLoc();
    const filtered = req.user.role === 'admin' ? accounts : accounts.filter(a => a.clientId === req.user.client_id);
    res.json(filtered.map(a => ({ ...a, ...computeAccount(a) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /accounts/:id ───────────────────────────────────────────────────────
router.get('/accounts/:id', async (req, res) => {
  try {
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === req.params.id);
    if (!acct) return res.status(404).json({ error: 'Not found' });
    res.json({ ...acct, ...computeAccount(acct) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /accounts ──────────────────────────────────────────────────────────
router.post('/accounts', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { clientId, creditLimit, factorRate, term, paymentFrequency } = req.body;
    if (!clientId || !creditLimit) return res.status(400).json({ error: 'clientId and creditLimit required' });
    const accounts = await loadLoc();
    const acct = {
      id: `loc_${Date.now()}`, clientId,
      creditLimit: parseFloat(creditLimit),
      factorRate: parseFloat(factorRate) || 1.2,
      term: parseInt(term) || 12,
      paymentFrequency: paymentFrequency || 'monthly',
      draws: [], payments: [], status: 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    accounts.push(acct);
    await saveLoc(accounts);
    res.status(201).json({ ...acct, ...computeAccount(acct) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PATCH /accounts/:id — update account settings ───────────────────────────
router.patch('/accounts/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === req.params.id);
    if (!acct) return res.status(404).json({ error: 'Not found' });
    const { creditLimit, factorRate, term, paymentFrequency } = req.body;
    if (creditLimit) acct.creditLimit = parseFloat(creditLimit);
    if (factorRate) acct.factorRate = parseFloat(factorRate);
    if (term) acct.term = parseInt(term);
    if (paymentFrequency) acct.paymentFrequency = paymentFrequency;
    acct.updatedAt = new Date().toISOString();
    await saveLoc(accounts);
    res.json({ ...acct, ...computeAccount(acct) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /draw-request ──────────────────────────────────────────────────────
router.post('/draw-request', async (req, res) => {
  try {
    const { locAccountId, amount, reason } = req.body;
    if (!locAccountId || !amount) return res.status(400).json({ error: 'locAccountId and amount required' });
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === locAccountId);
    if (!acct) return res.status(404).json({ error: 'Not found' });
    const computed = computeAccount(acct);
    if (amount > computed.availability) return res.status(400).json({ error: `Exceeds availability of $${computed.availability.toFixed(2)}` });

    const paybackAmount = parseFloat((amount * acct.factorRate).toFixed(2));
    const freq = acct.paymentFrequency || 'monthly';
    const totalPayments = freq === 'weekly' ? Math.round(acct.term * 4.33) : acct.term;
    const installment = parseFloat((paybackAmount / totalPayments).toFixed(2));

    const draw = {
      id: `draw_${Date.now()}`, locAccountId,
      amount: parseFloat(amount), paybackAmount, installment,
      factorRate: acct.factorRate, termMonths: acct.term, paymentFrequency: freq,
      reason: reason || '', status: 'pending_approval',
      requestedBy: req.user.id, requestedByName: req.user.full_name,
      requestedAt: new Date().toISOString(),
    };
    const draws = await loadDraws();
    draws.push(draw);
    await saveDraws(draws);

    // Email matthews@capital-infusion.com
    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const FROM = process.env.FROM_EMAIL || 'noreply@orbit-technology.com';
      const PORTAL = process.env.FRONTEND_URL || 'https://orbit-technology.com';
      await ses.send(new SendEmailCommand({
        Source: `Capital Infusion <${FROM}>`,
        Destination: { ToAddresses: ['matthews@capital-infusion.com'] },
        Message: {
          Subject: { Data: `LOC Draw: $${parseFloat(amount).toLocaleString()} — Approval Needed` },
          Body: { Html: { Data: `<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px"><h2>LOC Draw Request</h2><div style="background:#f5f5f7;border-radius:12px;padding:16px;margin:16px 0"><p><strong>Draw:</strong> $${parseFloat(amount).toLocaleString()}</p><p><strong>Payback:</strong> $${paybackAmount.toLocaleString()} (${acct.factorRate}x)</p><p><strong>${freq === 'weekly' ? 'Weekly' : 'Monthly'} Payment:</strong> $${installment.toLocaleString()}</p><p><strong>Term:</strong> ${acct.term} months</p><p><strong>By:</strong> ${req.user.full_name}</p><p><strong>Balance After:</strong> $${(computed.balance + paybackAmount).toLocaleString()}</p><p><strong>Availability After:</strong> $${(computed.availability - amount).toLocaleString()}</p></div><p><a href="${PORTAL}/ci-loc?action=approve&drawId=${draw.id}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">✓ Approve</a><a href="${PORTAL}/ci-loc?action=deny&drawId=${draw.id}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">✗ Deny</a></p></div>` } },
        },
      }));
    } catch (e) { console.error('[LOC] Email failed:', e.message); }

    res.status(201).json(draw);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /draw/:id/approve — reamortization happens here ────────────────────
router.post('/draw/:drawId/approve', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const draws = await loadDraws();
    const draw = draws.find(d => d.id === req.params.drawId);
    if (!draw) return res.status(404).json({ error: 'Not found' });
    if (draw.status !== 'pending_approval') return res.status(400).json({ error: `Draw is ${draw.status}` });

    draw.status = 'funded';
    draw.approvedBy = req.user.id;
    draw.approvedAt = new Date().toISOString();
    await saveDraws(draws);

    // Add to LOC account — reamortization: close old deal, new combined deal
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === draw.locAccountId);
    if (acct) {
      // Close previous active draws (reamortization — they're absorbed into the new combined deal)
      acct.draws.forEach(d => { if (d.status === 'funded') d.status = 'reamortized'; });
      
      // Calculate new combined payback
      const totalPaid = (acct.payments || []).reduce((s, p) => s + p.amount, 0);
      const oldRemaining = acct.draws.filter(d => d.status === 'reamortized').reduce((s, d) => s + (d.paybackAmount || d.amount), 0) - totalPaid;
      const newPayback = Math.max(0, oldRemaining) + draw.paybackAmount;
      const freq = acct.paymentFrequency || 'monthly';
      const totalPayments = freq === 'weekly' ? Math.round(acct.term * 4.33) : acct.term;
      const newInstallment = parseFloat((newPayback / totalPayments).toFixed(2));

      acct.draws.push({
        id: draw.id, amount: draw.amount,
        paybackAmount: newPayback, installment: newInstallment,
        factorRate: acct.factorRate, date: draw.approvedAt, status: 'funded',
        isReamortized: oldRemaining > 0,
        previousBalance: Math.max(0, oldRemaining),
      });
      acct.updatedAt = new Date().toISOString();
      await saveLoc(accounts);
    }

    res.json({ ...draw, message: 'Approved — reamortization applied' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /draw/:id/deny ─────────────────────────────────────────────────────
router.post('/draw/:drawId/deny', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const draws = await loadDraws();
    const draw = draws.find(d => d.id === req.params.drawId);
    if (!draw) return res.status(404).json({ error: 'Not found' });
    draw.status = 'denied';
    draw.deniedBy = req.user.id;
    draw.deniedAt = new Date().toISOString();
    draw.denyReason = req.body.reason || '';
    await saveDraws(draws);
    res.json(draw);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /payment ───────────────────────────────────────────────────────────
router.post('/payment', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { locAccountId, amount, paymentMethod } = req.body;
    if (!locAccountId || !amount) return res.status(400).json({ error: 'locAccountId and amount required' });
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === locAccountId);
    if (!acct) return res.status(404).json({ error: 'Not found' });
    acct.payments.push({
      id: `pay_${Date.now()}`, amount: parseFloat(amount),
      date: new Date().toISOString(), method: paymentMethod || 'ACH',
      recordedBy: req.user.id,
    });
    acct.updatedAt = new Date().toISOString();
    await saveLoc(accounts);
    res.json({ ...acct, ...computeAccount(acct) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /draws ──────────────────────────────────────────────────────────────
router.get('/draws', async (req, res) => {
  try {
    const draws = await loadDraws();
    const filtered = req.query.locAccountId ? draws.filter(d => d.locAccountId === req.query.locAccountId) : draws;
    res.json(filtered.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /pending ────────────────────────────────────────────────────────────
router.get('/pending', async (req, res) => {
  try {
    const draws = await loadDraws();
    res.json(draws.filter(d => d.status === 'pending_approval'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
