// Recalculate every retailer's outstanding balance from their orders.
//   node scripts/updateOutstanding.js
//
// Run this once after upgrading — the old recordPayment decremented
// `outstanding` rather than recalculating it, so stored values have drifted.
//
// The previous version of this script had its own bug: it subtracted
// SUM(paid_amount) over ALL orders from SUM(total_amount) over non-cancelled
// orders, so any cancelled order that had been partly paid skewed the result.
// Summing `balance` with a consistent filter avoids that entirely.

const pool = require('../config/db');
require('dotenv').config();

const updateOutstanding = async () => {
  try {
    console.log('🔄 Recalculating outstanding balances...');

    const [before] = await pool.query(
      'SELECT id, shop_name, outstanding FROM retailers ORDER BY id'
    );

    const [result] = await pool.query(`
      UPDATE retailers r
      SET r.outstanding = (
        SELECT COALESCE(SUM(o.balance), 0)
        FROM orders o
        WHERE o.retailer_id = r.id
          AND o.order_status != 'cancelled'
      )
    `);

    const [after] = await pool.query(
      'SELECT id, shop_name, outstanding FROM retailers ORDER BY id'
    );

    const beforeById = new Map(before.map((r) => [r.id, parseFloat(r.outstanding) || 0]));
    const changed = after
      .map((r) => ({
        id: r.id,
        shop: r.shop_name,
        was: beforeById.get(r.id) ?? 0,
        now: parseFloat(r.outstanding) || 0,
      }))
      .filter((r) => Math.abs(r.was - r.now) > 0.005);

    console.log(`\n✅ Touched ${result.affectedRows} retailer(s)`);

    if (changed.length === 0) {
      console.log('🎉 Every balance already matched. No drift found.');
    } else {
      console.log(`⚠️  ${changed.length} balance(s) were wrong:\n`);
      console.table(
        changed.map((c) => ({
          Retailer: c.shop,
          'Stored (wrong)': c.was.toFixed(2),
          'Actual': c.now.toFixed(2),
          'Difference': (c.now - c.was).toFixed(2),
        }))
      );
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

updateOutstanding();
