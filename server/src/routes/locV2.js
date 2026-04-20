const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const { loadFromS3, saveToS3 } = require('../services/s3Store');
const OnyxClient = require('../services/onyxClient');

router.use(authMiddleware);

const LOC_FILE = 'loc_accounts_v2.json';
const DRAW_FILE = 'loc_draws_v2.json';

async function loadLoc() { return await loadFromS3(LOC_FILE); }
async function saveLoc(d) { await saveToS3(LOC_FILE, d); }
async function loadDraws() { return await loadFromS3(DRAW_FILE); }
async function saveDraws(d) { await saveToS3(DRAW_FILE, d); }

/**
 * LOC Account schema (Orbit-side tracking):
 * {
 *   id, clientId, onyxClientId, onyxApplicationId,
 *   creditLimit, balance, availability,
 *   interestRate, term, paymentFrequency,
 *   draws: [{ id, amount, date, status, fundingId }],
 *   payments: [{ id, amount, date, type }],
 *   status: 'active' | 'closed',
 *   createdAt, updatedAt
 * }
 *
 * Balance = sum of all draw amounts - sum of all payment amounts (principal portion)
 * Availability = creditLimit - balance (NOT including payments in availability)
 * Each draw creates a new "deal" — reamortization resets
 */

// ─── GET /api/loc-v2/accounts — list all LOC accounts ────────────────────────
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await loadLoc();
    const filtered = req.user.role === 'admin'
      ? accounts
      : accounts.filter(a => a.clientId === req.user.client_id);
    res.json(filtered);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/loc-v2/accounts/:id — get single LOC account with computed balance ─
router.get('/accounts/:id', async (req, res) => {
  try {
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === req.params.id);
    if (!acct) return res.status(404).json({ error: 'LOC account not found' });

    // Compute balance and availability
    const totalDrawn = (acct.draws || []).filter(d => d.status === 'funded').reduce((s, d) => s + d.amount, 0);
    const totalPaid = (acct.payments || []).reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, totalDrawn - totalPaid);
    const availability = Math.max(0, acct.creditLimit - balance);

    // Next payment: find the nearest upcoming payment from funded draws
    const fundedDraws = (acct.draws || []).filter(d => d.status === 'funded' && d.nextPaymentDate);
    const now = Date.now();
    const upcoming = fundedDraws
      .filter(d => new Date(d.nextPaymentDate).getTime() > now)
      .sort((a, b) => new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate));
    const nextPayment = upcoming.length > 0 ? {
      amount: upcoming[0].paybackAmount || upcoming[0].amount,
      date: upcoming[0].nextPaymentDate,
      drawId: upcoming[0].id,
    } : null;

    // Total payback owed (all funded draws payback - payments made)
    const totalPayback = fundedDraws.reduce((s, d) => s + (d.paybackAmount || d.amount), 0);
    const totalOwed = Math.max(0, totalPayback - totalPaid);

    res.json({ ...acct, balance, availability, totalDrawn, totalPaid, totalOwed, nextPayment });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/loc-v2/accounts — create LOC account ──────────────────────────
router.post('/accounts', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { clientId, creditLimit, interestRate, term, paymentFrequency, onyxClientId } = req.body;
    if (!clientId || !creditLimit) return res.status(400).json({ error: 'clientId and creditLimit required' });

    const accounts = await loadLoc();
    const acct = {
      id: `loc_${Date.now()}`,
      clientId,
      onyxClientId: onyxClientId || null,
      onyxApplicationId: null,
      creditLimit: parseFloat(creditLimit),
      factorRate: parseFloat(req.body.factorRate) || 1.35,
      paymentTermDays: parseInt(req.body.paymentTermDays) || 30,
      interestRate: parseFloat(interestRate) || 0,
      term: parseInt(term) || 12,
      paymentFrequency: paymentFrequency || 'monthly',
      draws: [],
      payments: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    accounts.push(acct);
    await saveLoc(accounts);
    res.status(201).json(acct);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/loc-v2/draw-request — request a draw (triggers approval webhook) ─
router.post('/draw-request', async (req, res) => {
  try {
    const { locAccountId, amount, reason } = req.body;
    if (!locAccountId || !amount) return res.status(400).json({ error: 'locAccountId and amount required' });

    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === locAccountId);
    if (!acct) return res.status(404).json({ error: 'LOC account not found' });

    // Check availability
    const totalDrawn = (acct.draws || []).filter(d => d.status === 'funded').reduce((s, d) => s + d.amount, 0);
    const totalPaid = (acct.payments || []).reduce((s, p) => s + p.amount, 0);
    const balance = totalDrawn - totalPaid;
    const availability = acct.creditLimit - balance;

    if (amount > availability) return res.status(400).json({ error: `Requested $${amount} exceeds availability of $${availability.toFixed(2)}` });

    const draw = {
      id: `draw_${Date.now()}`,
      locAccountId,
      amount: parseFloat(amount),
      reason: reason || '',
      status: 'pending_approval',
      requestedBy: req.user.id,
      requestedByName: req.user.full_name,
      requestedAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      fundingId: null,
    };

    const draws = await loadDraws();
    draws.push(draw);
    await saveDraws(draws);

    // Send approval webhook email to chris@capital-infusion.com
    try {
      const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
      const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const FROM = process.env.FROM_EMAIL || 'noreply@orbit-technology.com';
      const PORTAL = process.env.FRONTEND_URL || 'https://orbit-technology.com';
      const approveUrl = `${PORTAL}/ci-loc?action=approve&drawId=${draw.id}`;
      const denyUrl = `${PORTAL}/ci-loc?action=deny&drawId=${draw.id}`;

      await ses.send(new SendEmailCommand({
        Source: `Capital Infusion <${FROM}>`,
        Destination: { ToAddresses: ['matthews@capital-infusion.com'] },
        Message: {
          Subject: { Data: `LOC Draw Request: $${amount.toLocaleString()} — Approval Needed` },
          Body: {
            Html: { Data: `<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px"><h2 style="color:#1d1d1f">LOC Draw Request</h2><div style="background:#f5f5f7;border-radius:12px;padding:16px;margin:16px 0"><p style="margin:4px 0"><strong>Amount:</strong> $${parseFloat(amount).toLocaleString()}</p><p style="margin:4px 0"><strong>Requested by:</strong> ${req.user.full_name}</p><p style="margin:4px 0"><strong>Reason:</strong> ${reason || 'N/A'}</p><p style="margin:4px 0"><strong>Current Balance:</strong> $${balance.toFixed(2)}</p><p style="margin:4px 0"><strong>Availability:</strong> $${availability.toFixed(2)}</p><p style="margin:4px 0"><strong>Credit Limit:</strong> $${acct.creditLimit.toLocaleString()}</p></div><p><a href="${approveUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-right:12px;">✓ Approve</a><a href="${denyUrl}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">✗ Deny</a></p></div>` },
            Text: { Data: `LOC Draw Request: $${amount} by ${req.user.full_name}. Approve: ${approveUrl} | Deny: ${denyUrl}` },
          },
        },
      }));
      console.log(`[LOC] Draw request email sent to chris@capital-infusion.com for $${amount}`);
    } catch (e) { console.error('[LOC] Email failed:', e.message); }

    res.status(201).json(draw);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/loc-v2/draw/:drawId/approve — approve a draw ──────────────────
router.post('/draw/:drawId/approve', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const draws = await loadDraws();
    const draw = draws.find(d => d.id === req.params.drawId);
    if (!draw) return res.status(404).json({ error: 'Draw not found' });
    if (draw.status !== 'pending_approval') return res.status(400).json({ error: `Draw is ${draw.status}, not pending` });

    draw.status = 'funded';
    draw.approvedBy = req.user.id;
    draw.approvedAt = new Date().toISOString();
    // Calculate payback and next payment date
    const accounts2 = await loadLoc();
    const acct2 = accounts2.find(a => a.id === draw.locAccountId);
    const factorRate = acct2?.factorRate || 1.35;
    const termDays = acct2?.paymentTermDays || 30;
    draw.paybackAmount = parseFloat((draw.amount * factorRate).toFixed(2));
    draw.nextPaymentDate = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000).toISOString();
    draw.nextPaymentAmount = draw.paybackAmount;
    draw.factorRate = factorRate;
    draw.termDays = termDays;
    await saveDraws(draws);

    // Add draw to LOC account — this is the new "deal", reamortization resets
    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === draw.locAccountId);
    if (acct) {
      acct.draws.push({
        id: draw.id,
        amount: draw.amount,
        paybackAmount: draw.paybackAmount,
        nextPaymentDate: draw.nextPaymentDate,
        factorRate: draw.factorRate,
        termDays: draw.termDays,
        date: draw.approvedAt,
        status: 'funded',
      });
      acct.updatedAt = new Date().toISOString();
      await saveLoc(accounts);
    }

    res.json({ ...draw, message: 'Draw approved and funded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/loc-v2/draw/:drawId/deny — deny a draw ────────────────────────
router.post('/draw/:drawId/deny', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const draws = await loadDraws();
    const draw = draws.find(d => d.id === req.params.drawId);
    if (!draw) return res.status(404).json({ error: 'Draw not found' });

    draw.status = 'denied';
    draw.deniedBy = req.user.id;
    draw.deniedAt = new Date().toISOString();
    draw.denyReason = req.body.reason || '';
    await saveDraws(draws);

    res.json({ ...draw, message: 'Draw denied' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/loc-v2/payment — record a payment ─────────────────────────────
router.post('/payment', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { locAccountId, amount, paymentMethod } = req.body;
    if (!locAccountId || !amount) return res.status(400).json({ error: 'locAccountId and amount required' });

    const accounts = await loadLoc();
    const acct = accounts.find(a => a.id === locAccountId);
    if (!acct) return res.status(404).json({ error: 'LOC account not found' });

    const payment = {
      id: `pay_${Date.now()}`,
      amount: parseFloat(amount),
      date: new Date().toISOString(),
      method: paymentMethod || 'ACH',
      recordedBy: req.user.id,
    };

    acct.payments.push(payment);
    acct.updatedAt = new Date().toISOString();
    await saveLoc(accounts);

    // Also push to Onyx if we have an applicationId
    if (acct.onyxApplicationId) {
      try {
        await OnyxClient.createPayment({
          amount: payment.amount,
          applicationId: acct.onyxApplicationId,
          externalId: payment.id,
        });
        console.log(`[LOC] Payment synced to Onyx: $${payment.amount}`);
      } catch (e) { console.log(`[LOC] Onyx payment sync failed: ${e.message}`); }
    }

    // Recalculate
    const totalDrawn = acct.draws.filter(d => d.status === 'funded').reduce((s, d) => s + d.amount, 0);
    const totalPaid = acct.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, totalDrawn - totalPaid);
    const availability = Math.max(0, acct.creditLimit - balance);

    res.json({ payment, balance, availability });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/loc-v2/draws — list all draws ───────────────────────────────────
router.get('/draws', async (req, res) => {
  try {
    const draws = await loadDraws();
    const filtered = req.query.locAccountId
      ? draws.filter(d => d.locAccountId === req.query.locAccountId)
      : draws;
    res.json(filtered.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/loc-v2/pending — list pending draw requests ─────────────────────
router.get('/pending', async (req, res) => {
  try {
    const draws = await loadDraws();
    res.json(draws.filter(d => d.status === 'pending_approval'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Onyx sync endpoints ──────────────────────────────────────────────────────

// Sync client to Onyx
router.post('/onyx/sync-client', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { name, email, grossMonthlySales, dateOfOwnership, ein, phoneNumber, businessType } = req.body;
    const result = await OnyxClient.createClient({
      externalId: `orbit-${Date.now()}`, name, email,
      grossMonthlySales: grossMonthlySales || 100000,
      dateOfOwnership: dateOfOwnership || '2020-01-01',
      ein, phoneNumber, businessType,
      owners: [{ primary: true, percent: 100, contact: { firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') || name, email } }],
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List Onyx clients
router.get('/onyx/clients', async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const result = await OnyxClient.listClients(req.query.page || 0);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
