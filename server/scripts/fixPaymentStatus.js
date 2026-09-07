// Recalculate payment_status for every order from its actual balance.
//   node scripts/fixPaymentStatus.js
//
// Run this after applying the payment_status fixes across driverController,
// orderController.recordPayment, and paymentService.settleTransaction —
// orders that changed balance before those fixes (or through a path that
// predates them) can be left with a stale payment_status even after their
// balance is effectively zero. This script derives the correct status for
// every order from what's actually there.
//
// PAID_THRESHOLD is ₹1, not ₹0 or a few paise. This business prices and
// displays everything in whole rupees — no screen anywhere shows paise —
// so a balance of ₹0.40 left over from a kg × rate calculation is not real
// money owed, it's rounding dust, and should never keep an order stuck on
// "Partial" forever.

const pool = require('../config/db');
require('dotenv').config();

const PAID_THRESHOLD = 1; // rupees

const fixPaymentStatus = async () => {
  try {
    console.log(`🔄 Recalculating payment_status for every order (paid threshold: ₹${PAID_THRESHOLD})...`);

    const [before] = await pool.query(
      `SELECT id, order_number, balance, paid_amount, payment_status
         FROM orders
        WHERE order_status != 'cancelled'`
    );

    // paid: balance is under a rupee — not real money owed at this
    // business's whole-rupee pricing.
    const [paidResult] = await pool.query(
      `UPDATE orders
          SET payment_status = 'paid'
        WHERE order_status != 'cancelled'
          AND balance < ?`,
      [PAID_THRESHOLD]
    );

    // partial: still owes a real amount, but some money has come in
    const [partialResult] = await pool.query(
      `UPDATE orders
          SET payment_status = 'partial'
        WHERE order_status != 'cancelled'
          AND balance >= ?
          AND paid_amount > 0`,
      [PAID_THRESHOLD]
    );

    // pending: owes the full amount, nothing paid yet
    const [pendingResult] = await pool.query(
      `UPDATE orders
          SET payment_status = 'pending'
        WHERE order_status != 'cancelled'
          AND balance >= ?
          AND paid_amount <= 0`,
      [PAID_THRESHOLD]
    );

    const [after] = await pool.query(
      `SELECT id, order_number, balance, paid_amount, payment_status
         FROM orders
        WHERE order_status != 'cancelled'`
    );

    const beforeById = new Map(before.map((o) => [o.id, o.payment_status]));
    const changed = after.filter((o) => beforeById.get(o.id) !== o.payment_status);

    console.log(`✅ Checked ${after.length} orders — set ${paidResult.affectedRows} paid, ${partialResult.affectedRows} partial, ${pendingResult.affectedRows} pending.`);
    if (changed.length > 0) {
      console.log(`\n📋 ${changed.length} order(s) had their status corrected:`);
      changed.forEach((o) => {
        console.log(
          `   ${o.order_number}: ${beforeById.get(o.id)} → ${o.payment_status}  (balance ₹${o.balance}, paid ₹${o.paid_amount})`
        );
      });
    } else {
      console.log('ℹ️  No orders needed correcting — everything was already accurate.');
    }

    // Re-sync retailers.outstanding too, since it's derived from the same
    // balance figures. Anything under the paid threshold is also swept out
    // of "what's actually owed" here for the same reason.
    await pool.query(
      `UPDATE retailers r
          SET r.outstanding = (
            SELECT COALESCE(SUM(o.balance), 0)
              FROM orders o
             WHERE o.retailer_id = r.id
               AND o.order_status != 'cancelled'
               AND o.balance >= ?
          )`,
      [PAID_THRESHOLD]
    );
    console.log('✅ Retailer outstanding balances re-synced.');

    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

fixPaymentStatus();