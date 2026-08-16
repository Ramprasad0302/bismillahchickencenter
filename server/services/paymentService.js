const pool = require('../config/db');
const config = require('../config/payment');

// ============================================
// Reference / payment number generators
// ============================================
const dateStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

const generateReference = async () => {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM payment_transactions WHERE DATE(created_at) = CURDATE()'
  );
  const n = rows[0].count + 1;
  return `TXN-${dateStamp()}-${String(n).padStart(4, '0')}`;
};

const generatePaymentNumber = async (connection) => {
  const [rows] = await connection.query(
    'SELECT COUNT(*) AS count FROM payments WHERE DATE(created_at) = CURDATE()'
  );
  const n = rows[0].count + 1;
  return `PAY-${dateStamp()}-${String(n).padStart(4, '0')}`;
};

// ============================================
// How much does this retailer actually owe?
// Always computed server-side. The browser never gets to name the amount.
// ============================================
const getPayableSummary = async (retailerId, orderId = null) => {
  if (orderId) {
    const [rows] = await pool.query(
      `SELECT id, order_number, total_amount, paid_amount, balance, order_date
         FROM orders
        WHERE id = ? AND retailer_id = ?`,
      [orderId, retailerId]
    );
    if (rows.length === 0) {
      const err = new Error('Order not found for this retailer');
      err.status = 404;
      throw err;
    }
    return {
      payable: parseFloat(rows[0].balance) || 0,
      bills: rows.filter((r) => parseFloat(r.balance) > 0),
    };
  }

  const [bills] = await pool.query(
    `SELECT id, order_number, total_amount, paid_amount, balance, order_date
       FROM orders
      WHERE retailer_id = ? AND balance > 0 AND order_status != 'cancelled'
      ORDER BY order_date ASC, id ASC`,
    [retailerId]
  );

  const payable = bills.reduce((sum, b) => sum + (parseFloat(b.balance) || 0), 0);
  return { payable: parseFloat(payable.toFixed(2)), bills };
};

// ============================================
// SETTLE — the only place money is applied to the books.
//
// Called by the webhook, and by the status poll as a fallback. Safe to call
// twice: the transaction row is locked and the `settled` flag short-circuits.
// ============================================
const settleTransaction = async ({
  reference,
  providerPaymentId,
  amountPaid,
  rawPayload,
}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the row so two webhook deliveries can't both apply it.
    const [txnRows] = await connection.query(
      'SELECT * FROM payment_transactions WHERE reference = ? FOR UPDATE',
      [reference]
    );

    if (txnRows.length === 0) {
      await connection.rollback();
      return { applied: false, reason: 'unknown_reference' };
    }

    const txn = txnRows[0];

    if (txn.settled === 1) {
      await connection.rollback();
      return { applied: false, reason: 'already_settled', transaction: txn };
    }

    const retailerId = txn.retailer_id;
    // Trust the gateway's figure over anything we stored, but fall back.
    const amount = parseFloat(amountPaid || txn.amount);

    // --- 1. Allocate across bills, oldest first (or the one order chosen) ---
    let remaining = amount;
    const allocations = [];

    const [bills] = await connection.query(
      txn.order_id
        ? `SELECT id, order_number, balance, paid_amount, total_amount
             FROM orders
            WHERE id = ? AND retailer_id = ? FOR UPDATE`
        : `SELECT id, order_number, balance, paid_amount, total_amount
             FROM orders
            WHERE retailer_id = ? AND balance > 0 AND order_status != 'cancelled'
            ORDER BY order_date ASC, id ASC
            FOR UPDATE`,
      txn.order_id ? [txn.order_id, retailerId] : [retailerId]
    );

    for (const bill of bills) {
      if (remaining <= 0) break;

      const billBalance = parseFloat(bill.balance) || 0;
      if (billBalance <= 0) continue;

      const applyAmount = parseFloat(Math.min(remaining, billBalance).toFixed(2));
      const newBalance = parseFloat((billBalance - applyAmount).toFixed(2));
      const newPaid = parseFloat(
        ((parseFloat(bill.paid_amount) || 0) + applyAmount).toFixed(2)
      );

      // Existing recordPayment never touched payment_status — this does.
      const paymentStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

      await connection.query(
        `UPDATE orders
            SET balance = ?, paid_amount = ?, payment_status = ?
          WHERE id = ?`,
        [newBalance, newPaid, paymentStatus, bill.id]
      );

      allocations.push({
        order_id: bill.id,
        order_number: bill.order_number,
        amount: applyAmount,
      });
      remaining = parseFloat((remaining - applyAmount).toFixed(2));
    }

    // --- 1b. A fresh order created for this checkout attempt (place-order
    // → pay-with-UPI flow) is still sitting in 'pending' until its payment
    // clears. Move it forward now that the money has landed.
    if (txn.order_id) {
      await connection.query(
        `UPDATE orders SET order_status = 'confirmed' WHERE id = ? AND order_status = 'pending'`,
        [txn.order_id]
      );
    }

    // --- 2. Insert into the existing payments table ---
    const paymentNumber = await generatePaymentNumber(connection);

    const [paymentResult] = await connection.query(
      `INSERT INTO payments (
         payment_number, retailer_id, order_id, amount, method, status,
         collected_by, collected_by_role, verified_by, verified_at, notes
       ) VALUES (?, ?, ?, ?, 'online', 'verified', ?, 'admin', ?, NOW(), ?)`,
      [
        paymentNumber,
        retailerId,
        allocations.length === 1 ? allocations[0].order_id : txn.order_id,
        amount,
        `${txn.provider} gateway`,
        `${txn.provider} gateway`,
        `Online payment ${reference}${providerPaymentId ? ` (${providerPaymentId})` : ''}`,
      ]
    );

    // --- 3. Recalculate the retailer's outstanding from the bills themselves ---
    // Safer than subtracting from the stored figure, which drifts.
    const [[{ outstanding }]] = await connection.query(
      `SELECT COALESCE(SUM(balance), 0) AS outstanding
         FROM orders
        WHERE retailer_id = ? AND order_status != 'cancelled'`,
      [retailerId]
    );

    await connection.query('UPDATE retailers SET outstanding = ? WHERE id = ?', [
      outstanding,
      retailerId,
    ]);

    // --- 4. Ledger credit ---
    await connection.query(
      `INSERT INTO \`${config.ledgerTable}\`
         (retailer_id, order_id, payment_id, type, amount, description, date, created_at)
       VALUES (?, ?, ?, 'credit', ?, ?, NOW(), NOW())`,
      [
        retailerId,
        allocations.length === 1 ? allocations[0].order_id : txn.order_id,
        paymentResult.insertId,
        amount,
        `Online payment via ${txn.provider}`,
      ]
    );

    // --- 5. Close out the transaction row ---
    await connection.query(
      `UPDATE payment_transactions
          SET status = 'success',
              settled = 1,
              provider_payment_id = COALESCE(?, provider_payment_id),
              payment_id = ?,
              allocations = ?,
              raw_payload = ?
        WHERE id = ?`,
      [
        providerPaymentId || null,
        paymentResult.insertId,
        JSON.stringify(allocations),
        rawPayload ? JSON.stringify(rawPayload).slice(0, 60000) : null,
        txn.id,
      ]
    );

    await connection.commit();

    // Overpayment is worth knowing about — it means the retailer paid more
    // than the bills on file and the surplus is not sitting anywhere.
    if (remaining > 0) {
      console.warn(
        `⚠️  Payment ${reference}: ₹${remaining} could not be allocated (no open bills). Recorded in payments but not against any order.`
      );
    }

    return {
      applied: true,
      paymentId: paymentResult.insertId,
      paymentNumber,
      allocations,
      unallocated: remaining,
      outstanding: parseFloat(outstanding),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ============================================
// Mark a transaction failed / cancelled.
//
// If it was created for a brand-new order (the place-order → pay-with-UPI
// flow), that order is still sitting in 'pending' with nothing paid against
// it — a failed or cancelled checkout means the order never went through, so
// it's cancelled here rather than left behind as a phantom unpaid order.
// Pre-existing orders being settled through the general Payments page are
// untouched: this only fires for orders still in their original 'pending'
// state, before any staff/driver workflow has moved them along.
// ============================================
const failTransaction = async ({ reference, reason, status = 'failed' }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [txnRows] = await connection.query(
      'SELECT * FROM payment_transactions WHERE reference = ? FOR UPDATE',
      [reference]
    );
    if (txnRows.length === 0) {
      await connection.rollback();
      return { applied: false, reason: 'unknown_reference' };
    }

    const txn = txnRows[0];

    // A payment that already settled must never be walked back by a late
    // "failed" webhook (e.g. a delayed expiry event arriving after the poll
    // already settled it from the gateway's side).
    if (txn.settled === 1) {
      await connection.rollback();
      return { applied: false, reason: 'already_settled' };
    }

    await connection.query(
      `UPDATE payment_transactions SET status = ?, failure_reason = ? WHERE id = ?`,
      [status, (reason || '').slice(0, 255), txn.id]
    );

    if (txn.order_id) {
      const [orderRows] = await connection.query(
        `SELECT id, retailer_id, order_status FROM orders WHERE id = ? FOR UPDATE`,
        [txn.order_id]
      );
      const order = orderRows[0];

      if (order && order.order_status === 'pending') {
        await connection.query(`UPDATE orders SET order_status = 'cancelled' WHERE id = ?`, [
          order.id,
        ]);

        await connection.query(
          `UPDATE retailers
              SET outstanding = (
                SELECT COALESCE(SUM(balance), 0) FROM orders
                 WHERE retailer_id = ? AND order_status != 'cancelled'
              )
            WHERE id = ?`,
          [order.retailer_id, order.retailer_id]
        );
      }
    }

    await connection.commit();
    return { applied: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  generateReference,
  getPayableSummary,
  settleTransaction,
  failTransaction,
};