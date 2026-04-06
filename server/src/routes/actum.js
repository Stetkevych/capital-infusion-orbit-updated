/**
 * Actum API Routes
 * Internal Orbit endpoints for ACH payment processing via Actum.
 */

const express = require('express');
const router = express.Router();
const { sendToActum } = require('../services/actum/actumClient');
const { mapOrbitToActum, mapRepeatConsumer, generateMerOrderNumber, generateIdempotenceKey, maskAccount, maskRouting } = require('../services/actum/actumMapper');
const { validatePaymentRequest, validateRepeatConsumer } = require('../services/actum/actumValidation');
const { parseActumResponse } = require('../services/actum/actumParser');
const { TransactionStore, EventStore, PostbackStore, PaymentProfileStore } = require('../services/actum/actumStore');

const ACTUM_CONFIG = {
  parentId: process.env.ACTUM_PARENT_ID || '',
  subId: process.env.ACTUM_SUB_ID || '',
};

// ─── POST /api/actum/transactions ─────────────────────────────────────────────
// Create a one-time debit or credit ACH transaction
router.post('/transactions', async (req, res) => {
  try {
    const orbit = req.body;

    // Validate
    const validation = validatePaymentRequest(orbit);
    if (!validation.valid) return res.status(400).json({ error: 'Validation failed', errors: validation.errors });

    // Idempotency check
    const idempKey = orbit.idempotenceKey || generateIdempotenceKey(orbit.locId, orbit.amount);
    const existing = await TransactionStore.getByIdempotenceKey(idempKey);
    if (existing) {
      console.log('[Actum] Duplicate request blocked by idempotency:', idempKey);
      return res.json({ duplicate: true, transaction: existing });
    }

    // Map to Actum fields
    const merOrderNumber = generateMerOrderNumber(orbit.locId);
    const actumFields = mapOrbitToActum({ ...orbit, merOrderNumber, idempotenceKey: idempKey }, ACTUM_CONFIG);

    // Send to Actum
    const actumResponse = await sendToActum(actumFields);

    // Create transaction record
    const txn = await TransactionStore.create({
      locId: orbit.locId,
      borrowerId: orbit.borrowerId,
      merOrderNumber,
      actumOrderId: actumResponse.orderId,
      actumHistoryId: actumResponse.historyId,
      consumerUnique: actumResponse.consumerUnique,
      requestType: orbit.paymentType === 'credit' ? 'credit' : 'debit',
      amount: Number(orbit.amount),
      billingCycle: orbit.billingCycle || 'once',
      status: actumResponse.status,
      declineReason: actumResponse.status === 'declined' ? actumResponse.reason : null,
      authCode: actumResponse.authCode,
      maskedAccount: maskAccount(orbit.accountNumber),
      maskedRouting: maskRouting(orbit.routingNumber),
      accountType: orbit.accountType,
      idempotenceKey: idempKey,
      rawResponse: actumResponse.rawText,
      duplicateTrans: actumResponse.duplicateTrans,
      testTrans: actumResponse.testTrans,
      memo: orbit.memo,
      ipAddress: orbit.ipAddress || req.ip,
    });

    // Log event
    await EventStore.log({
      transactionId: txn.id,
      actumOrderId: actumResponse.orderId,
      eventType: actumResponse.status === 'accepted' ? 'accepted' : actumResponse.status === 'declined' ? 'declined' : 'created',
      status: actumResponse.status,
      detail: actumResponse.reason,
    });

    // Store payment profile for repeat-consumer if accepted
    if (actumResponse.status === 'accepted' && actumResponse.consumerUnique) {
      try {
        const existingProfile = await PaymentProfileStore.getByConsumerUnique(actumResponse.consumerUnique);
        if (!existingProfile) {
          await PaymentProfileStore.create({
            locId: orbit.locId,
            borrowerId: orbit.borrowerId,
            consumerUnique: actumResponse.consumerUnique,
            accountNumber: orbit.accountNumber,
            routingNumber: orbit.routingNumber,
            accountType: orbit.accountType,
            holderName: orbit.borrowerName,
          });
        }
      } catch (e) { console.log('[Actum] Profile store error:', e.message); }
    }

    res.json({ success: actumResponse.status === 'accepted', transaction: txn, actumResponse: { status: actumResponse.status, reason: actumResponse.reason, orderId: actumResponse.orderId, duplicate: actumResponse.duplicateTrans } });
  } catch (err) {
    console.error('[Actum] Transaction error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/actum/transactions/repeat ──────────────────────────────────────
// Repeat-consumer transaction using stored consumer_unique
router.post('/transactions/repeat', async (req, res) => {
  try {
    const orbit = req.body;
    const validation = validateRepeatConsumer(orbit);
    if (!validation.valid) return res.status(400).json({ error: 'Validation failed', errors: validation.errors });

    const merOrderNumber = generateMerOrderNumber(orbit.locId);
    const idempKey = generateIdempotenceKey(orbit.locId, orbit.amount);

    const existing = await TransactionStore.getByIdempotenceKey(idempKey);
    if (existing) return res.json({ duplicate: true, transaction: existing });

    const actumFields = mapRepeatConsumer({ ...orbit, merOrderNumber, idempotenceKey: idempKey }, ACTUM_CONFIG);
    const actumResponse = await sendToActum(actumFields);

    const txn = await TransactionStore.create({
      locId: orbit.locId,
      borrowerId: orbit.borrowerId,
      merOrderNumber,
      actumOrderId: actumResponse.orderId,
      actumHistoryId: actumResponse.historyId,
      consumerUnique: orbit.consumerUnique,
      requestType: orbit.paymentType === 'credit' ? 'credit' : 'debit',
      amount: Number(orbit.amount),
      status: actumResponse.status,
      declineReason: actumResponse.status === 'declined' ? actumResponse.reason : null,
      authCode: actumResponse.authCode,
      idempotenceKey: idempKey,
      rawResponse: actumResponse.rawText,
      memo: orbit.memo,
    });

    await EventStore.log({ transactionId: txn.id, actumOrderId: actumResponse.orderId, eventType: actumResponse.status, status: actumResponse.status, detail: actumResponse.reason });

    res.json({ success: actumResponse.status === 'accepted', transaction: txn });
  } catch (err) {
    console.error('[Actum] Repeat transaction error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/actum/transactions/refund ──────────────────────────────────────
// TODO: confirm exact refund request fields from final Actum merchant config
router.post('/transactions/refund', async (req, res) => {
  try {
    const { transactionId, amount, reason } = req.body;
    const txn = await TransactionStore.getById(transactionId);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    // TODO: send refund request to Actum with txn.actumOrderId
    // For now, log the intent
    await EventStore.log({ transactionId, actumOrderId: txn.actumOrderId, eventType: 'refund_requested', status: 'pending', detail: reason || 'Refund requested' });
    await TransactionStore.update(transactionId, { status: 'refund_pending' });

    res.json({ message: 'Refund request logged. Awaiting Actum confirmation.', transactionId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/actum/transactions/revoke ──────────────────────────────────────
// TODO: confirm revoke action parameters from Actum
router.post('/transactions/revoke', async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    const txn = await TransactionStore.getById(transactionId);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    await EventStore.log({ transactionId, actumOrderId: txn.actumOrderId, eventType: 'revoke_requested', status: 'pending', detail: reason || 'Revoke requested' });
    await TransactionStore.update(transactionId, { status: 'revoke_pending' });

    res.json({ message: 'Revoke request logged.', transactionId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/actum/transactions/cancel-recurring ────────────────────────────
// TODO: confirm cancel-recurring fields from Actum
router.post('/transactions/cancel-recurring', async (req, res) => {
  try {
    const { transactionId } = req.body;
    const txn = await TransactionStore.getById(transactionId);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    await EventStore.log({ transactionId, actumOrderId: txn.actumOrderId, eventType: 'cancel_recurring', status: 'pending', detail: 'Recurring cancellation requested' });
    await TransactionStore.update(transactionId, { status: 'recurring_cancelled' });

    res.json({ message: 'Recurring cancellation logged.', transactionId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/actum/transactions/update ──────────────────────────────────────
// TODO: confirm update fields from Actum
router.post('/transactions/update', async (req, res) => {
  try {
    const { transactionId, updates } = req.body;
    const txn = await TransactionStore.update(transactionId, updates);
    res.json({ transaction: txn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/actum/transactions/:id ──────────────────────────────────────────
router.get('/transactions/:id', async (req, res) => {
  try {
    const txn = await TransactionStore.getById(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    const events = await EventStore.getByTransactionId(txn.id);
    res.json({ transaction: txn, events });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── POST /api/actum/postback ─────────────────────────────────────────────────
// Receives Actum postback/callback events
router.post('/postback', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[Actum Postback] Received:', JSON.stringify(payload).slice(0, 500));

    // Store raw postback
    await PostbackStore.log(payload);

    // Match to transaction
    const orderId = payload.orderid || payload.order_id || payload.order_info;
    const merOrder = payload.merordernumber || payload.order_info;
    const status = (payload.status || '').toLowerCase();

    let txn = null;
    if (orderId) txn = await TransactionStore.getByActumOrderId(orderId);
    if (!txn && merOrder) txn = await TransactionStore.getByMerOrderNumber(merOrder);

    if (txn) {
      const updates = { updatedAt: new Date().toISOString() };
      if (status === 'accepted' || status === 'settled') updates.status = 'accepted';
      else if (status === 'declined' || status === 'returned') updates.status = status;
      else if (status) updates.status = status;
      if (payload.reason) updates.declineReason = payload.reason;
      if (payload.authcode) updates.authCode = payload.authcode;

      await TransactionStore.update(txn.id, updates);
      await EventStore.log({ transactionId: txn.id, actumOrderId: orderId, eventType: 'postback', status: status || 'unknown', detail: payload.reason, rawPayload: payload });

      console.log('[Actum Postback] Updated transaction:', txn.id, '->', status);
    } else {
      console.log('[Actum Postback] No matching transaction for order:', orderId || merOrder);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Actum Postback] Error:', err.message);
    res.status(200).send('OK'); // Always return 200 to Actum
  }
});

// ─── POST /api/actum/webhook ──────────────────────────────────────────────────
// TODO: confirm webhook payload schema from Actum
router.post('/webhook', async (req, res) => {
  try {
    console.log('[Actum Webhook] Received:', JSON.stringify(req.body).slice(0, 500));
    await PostbackStore.log({ type: 'webhook', ...req.body });
    // TODO: process origination, return, RTP events
    res.status(200).send('OK');
  } catch (err) {
    console.error('[Actum Webhook] Error:', err.message);
    res.status(200).send('OK');
  }
});

// ─── GET /api/loc/:locId/payments ─────────────────────────────────────────────
router.get('/:locId/payments', async (req, res) => {
  try {
    const payments = await TransactionStore.getByLocId(req.params.locId);
    res.json(payments);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── GET /api/loc/:locId/payment-summary ──────────────────────────────────────
router.get('/:locId/payment-summary', async (req, res) => {
  try {
    const payments = await TransactionStore.getByLocId(req.params.locId);
    const accepted = payments.filter(p => p.status === 'accepted');
    const totalPaid = accepted.reduce((s, p) => s + p.amount, 0);
    const lastPayment = accepted[0] || null;
    const pending = payments.filter(p => p.status === 'pending');

    res.json({
      totalPayments: payments.length,
      totalAccepted: accepted.length,
      totalPaid: Math.round(totalPaid * 100) / 100,
      lastPaymentDate: lastPayment?.createdAt || null,
      lastPaymentAmount: lastPayment?.amount || null,
      pendingCount: pending.length,
      pendingAmount: Math.round(pending.reduce((s, p) => s + p.amount, 0) * 100) / 100,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
