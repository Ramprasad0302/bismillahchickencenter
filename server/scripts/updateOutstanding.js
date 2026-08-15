<<<<<<< HEAD
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

=======
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
const pool = require('../config/db');
require('dotenv').config();

const updateOutstanding = async () => {
  try {
<<<<<<< HEAD
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
=======
    console.log('🔄 Updating outstanding balances...');
    console.log('=================================');

    // Check current values first
    console.log('📊 Current outstanding values:');
    const [before] = await pool.query(`
      SELECT id, shop_name, outstanding FROM retailers
    `);
    console.table(before);

    // Update outstanding
    const [result] = await pool.query(`
      UPDATE retailers r
      SET r.outstanding = (
        SELECT COALESCE(SUM(o.total_amount), 0)
        FROM orders o
        WHERE o.retailer_id = r.id
        AND o.order_status != 'cancelled'
      ) - (
        SELECT COALESCE(SUM(o.paid_amount), 0)
        FROM orders o
        WHERE o.retailer_id = r.id
      )
    `);

    console.log(`\n✅ Outstanding updated for ${result.affectedRows} retailers`);

    // Verify the update
    console.log('\n📊 Updated outstanding values:');
    const [after] = await pool.query(`
      SELECT 
        r.id,
        r.shop_name,
        r.outstanding,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_amount,
        COALESCE(SUM(o.paid_amount), 0) as total_paid
      FROM retailers r
      LEFT JOIN orders o ON r.id = o.retailer_id
      GROUP BY r.id
    `);
    console.table(after);

    console.log('\n🎉 Outstanding update completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating outstanding:', error.message);
    console.error('❌ Details:', error);
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    process.exit(1);
  }
};

<<<<<<< HEAD
updateOutstanding();
=======
updateOutstanding();
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
