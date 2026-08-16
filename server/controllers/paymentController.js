const pool = require('../config/db');
const config = require('../config/payment');
const { getGateway } = require('../services/paymentGateway');
const paymentService = require('../services/paymentService');

// Resolve the logged-in user to a retailer row.
const getRetailerForUser = async (userId) => {
  const [rows] = await pool.query(
    `SELECT r.id, r.shop_name, r.owner_name, r.phone, r.email, r.outstanding
       FROM retailers r
      WHERE r.user_id = ?`,
    [userId]
  );
  return rows[0] || null;
};

// ============================================
// GET /api/payments/summary
// What the retailer owes, and which bills make it up.
// ============================================
const getPaymentSummary = async (req, res) => {
  try {
    const retailer = await getRetailerForUser(req.user.id);
    if (!retailer) {
      return res.status(404).json({ success: false, message: 'Retailer profile not found' });
    }

    const { payable, bills } = await paymentService.getPayableSummary(retailer.id);

    res.json({
      success: true,
      data: {
        retailer_id: retailer.id,
        shop_name: retailer.shop_name,
        payable,
        provider: config.provider,
        currency: config.currency,
        bills: bills.map((b) => ({
          id: b.id,
          order_number: b.order_number,
          total_amount: parseFloat(b.total_amount),
          paid_amount: parseFloat(b.paid_amount),
          balance: parseFloat(b.balance),
          order_date: b.order_date,
        })),
      },
    });
  } catch (error) {
    console.error('❌ getPaymentSummary:', error);
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET /api/payments
// Payment history. Retailers see their own, admins see everyone's.
// (The React app was already calling this and swallowing the 404.)
// ============================================
const getPayments = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    let sql = `
      SELECT p.id, p.payment_number, p.retailer_id, p.order_id, p.amount,
             p.method, p.status, p.collected_by, p.collected_by_role,
             p.date, p.notes, p.created_at,
             o.order_number, r.shop_name
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        LEFT JOIN retailers r ON p.retailer_id = r.id
    `;
    const params = [];

    if (!isAdmin) {
      const retailer = await getRetailerForUser(req.user.id);
      if (!retailer) {
        return res.json({ success: true, data: [] });
      }
      sql += ' WHERE p.retailer_id = ?';
      params.push(retailer.id);
    } else if (req.query.retailer_id) {
      sql += ' WHERE p.retailer_id = ?';
      params.push(req.query.retailer_id);
    }

    sql += ' ORDER BY p.date DESC, p.id DESC LIMIT 200';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ getPayments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// ============================================
// POST /api/payments/checkout
// body: { amount?, order_id? }
// Creates a gateway session and returns the URL to send the browser to.
// ============================================
const createCheckout = async (req, res) => {
  try {
    const retailer = await getRetailerForUser(req.user.id);
    if (!retailer) {
      return res.status(404).json({ success: false, message: 'Retailer profile not found' });
    }

    const orderId = req.body.order_id ? parseInt(req.body.order_id, 10) : null;
    const { payable } = await paymentService.getPayableSummary(retailer.id, orderId);

    if (payable <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nothing to pay. This balance is already cleared.',
      });
    }

    // The client may ask to pay less than the full balance, never more.
    let amount = payable;
    if (req.body.amount !== undefined && req.body.amount !== null && req.body.amount !== '') {
      const requested = parseFloat(req.body.amount);
      if (isNaN(requested) || requested <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid amount' });
      }
      if (requested > payable) {
        return res.status(400).json({
          success: false,
          message: `Amount cannot exceed the outstanding balance of ₹${payable}`,
        });
      }
      amount = parseFloat(requested.toFixed(2));
    }

    const gateway = getGateway();
    const reference = await paymentService.generateReference();

    // Record the intent BEFORE talking to the gateway, so a webhook that
    // arrives while we're still awaiting the response has a row to find.
    await pool.query(
      `INSERT INTO payment_transactions
         (reference, retailer_id, order_id, provider, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, 'created')`,
      [reference, retailer.id, orderId, gateway.name, amount, config.currency]
    );

    const description = orderId
      ? `Order payment — ${retailer.shop_name}`
      : `Outstanding balance — ${retailer.shop_name}`;

    let session;
    try {
      session = await gateway.createCheckout({
        reference,
        amount,
        description,
        customerEmail: retailer.email || undefined,
        customerPhone: retailer.phone || undefined,
        customerName: retailer.owner_name || undefined,
        successUrl: `${config.clientUrl}/retailer/payment/result?ref=${reference}`,
        cancelUrl: `${config.clientUrl}/retailer/payment/result?ref=${reference}&cancelled=1`,
        metadata: {
          retailer_id: String(retailer.id),
          order_id: orderId ? String(orderId) : '',
        },
      });
    } catch (gatewayError) {
      await pool.query(
        `UPDATE payment_transactions SET status = 'failed', failure_reason = ? WHERE reference = ?`,
        [String(gatewayError.message).slice(0, 255), reference]
      );
      throw gatewayError;
    }

    await pool.query(
      `UPDATE payment_transactions
          SET provider_session_id = ?, status = 'pending'
        WHERE reference = ?`,
      [session.providerSessionId, reference]
    );

    res.json({
      success: true,
      data: {
        reference,
        amount,
        currency: config.currency,
        provider: gateway.name,
        redirect_url: session.redirectUrl,
      },
    });
  } catch (error) {
    console.error('❌ createCheckout:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Could not start the payment',
    });
  }
};

// ============================================
// GET /api/payments/status/:reference
// The return page polls this. If the webhook hasn't landed yet (very common in
// local dev), it asks the gateway directly and settles from that.
// ============================================
const getTransactionStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM payment_transactions WHERE reference = ?',
      [reference]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    let txn = rows[0];

    // Ownership check — a retailer may only look at their own transactions.
    if (req.user.role !== 'admin') {
      const retailer = await getRetailerForUser(req.user.id);
      if (!retailer || retailer.id !== txn.retailer_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (txn.status === 'pending' && txn.provider_session_id) {
      const gateway = getGateway();
      const remote = await gateway.retrieveCheckout(txn.provider_session_id);

      if (remote.status === 'paid') {
        await paymentService.settleTransaction({
          reference,
          providerPaymentId: remote.providerPaymentId,
          amountPaid: remote.amount,
          rawPayload: remote.raw,
        });
      } else if (remote.status === 'failed') {
        await paymentService.failTransaction({ reference, reason: 'gateway reported failure' });
      }

      const [refreshed] = await pool.query(
        'SELECT * FROM payment_transactions WHERE reference = ?',
        [reference]
      );
      txn = refreshed[0];
    }

    res.json({
      success: true,
      data: {
        reference: txn.reference,
        status: txn.status,
        amount: parseFloat(txn.amount),
        currency: txn.currency,
        provider: txn.provider,
        settled: txn.settled === 1,
        allocations: txn.allocations
          ? typeof txn.allocations === 'string'
            ? JSON.parse(txn.allocations)
            : txn.allocations
          : [],
        failure_reason: txn.failure_reason,
        created_at: txn.created_at,
      },
    });
  } catch (error) {
    console.error('❌ getTransactionStatus:', error);
    res.status(500).json({ success: false, message: 'Could not check the payment status' });
  }
};

// ============================================
// POST /api/payments/cancel/:reference
// Called by the return page the moment the customer lands back on
// cancel_url. Stripe/Razorpay don't send a webhook for "customer clicked
// back" — the session just sits open until it expires (hours later) — so
// without this, an order created for that checkout would stay stuck in
// 'pending' until then.
// ============================================
const cancelTransaction = async (req, res) => {
  try {
    const { reference } = req.params;

    const [rows] = await pool.query('SELECT * FROM payment_transactions WHERE reference = ?', [
      reference,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const txn = rows[0];
    if (req.user.role !== 'admin') {
      const retailer = await getRetailerForUser(req.user.id);
      if (!retailer || retailer.id !== txn.retailer_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    await paymentService.failTransaction({
      reference,
      reason: 'Cancelled by customer',
      status: 'cancelled',
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ cancelTransaction:', error);
    res.status(500).json({ success: false, message: 'Could not cancel the payment' });
  }
};

// ============================================
// POST /api/payments/webhook
// No auth middleware. Trust comes from the signature, and req.body must be a
// raw Buffer here (see the express.raw mount in server.js).
// ============================================
const handleWebhook = async (req, res) => {
  const gateway = getGateway();
  const signature =
    req.headers['stripe-signature'] || req.headers['x-razorpay-signature'] || '';

  let event;
  try {
    event = gateway.parseWebhook({ rawBody: req.body, signature });
  } catch (error) {
    console.error('❌ Webhook signature rejected:', error.message);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  // Acknowledge fast. If our own processing throws, the gateway retrying
  // is fine — settleTransaction is idempotent.
  try {
    if (event.type === 'succeeded' && event.reference) {
      const result = await paymentService.settleTransaction({
        reference: event.reference,
        providerPaymentId: event.providerPaymentId,
        amountPaid: event.amount,
        rawPayload: event.raw,
      });
      console.log(
        `💳 Webhook ${event.reference}:`,
        result.applied ? `settled ₹${event.amount}` : `skipped (${result.reason})`
      );
    } else if (event.type === 'failed' && event.reference) {
      await paymentService.failTransaction({
        reference: event.reference,
        reason: event.reason,
        status: event.reason && event.reason.includes('expired') ? 'cancelled' : 'failed',
      });
      console.log(`💳 Webhook ${event.reference}: marked ${event.reason}`);
    }
  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    return res.status(500).json({ received: true, processed: false });
  }

  res.json({ received: true });
};

module.exports = {
  getPaymentSummary,
  getPayments,
  createCheckout,
  getTransactionStatus,
  cancelTransaction,
  handleWebhook,
};