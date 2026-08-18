// ============================================
// addAvgWeight.js
//
// Adds `avg_weight_per_bird` to the pricing table.
//
// The pricing table is append-only — every global price change inserts a new
// row and the newest row wins. So this column lives alongside
// default_price_per_kg and is carried forward on each insert.
//
//   Place in:  server/scripts/addAvgWeight.js
//   Run from:  server/     ->  node scripts/addAvgWeight.js
//
// Safe to run more than once: it checks before altering.
// ============================================
require('dotenv').config();

const pool = require('../config/db');

(async () => {
  try {
    console.log('📦 Connected.');

    const [cols] = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'pricing'
          AND column_name = 'avg_weight_per_bird'`
    );

    if (cols.length > 0) {
      console.log('✅ Column avg_weight_per_bird already exists — nothing to do.');
    } else {
      await pool.query(
        `ALTER TABLE pricing
           ADD COLUMN avg_weight_per_bird DECIMAL(5,2) NULL
           AFTER default_price_per_kg`
      );
      console.log('✅ Added pricing.avg_weight_per_bird');
    }

    // Backfill: existing history rows have NULL. Leave them NULL (they genuinely
    // had no value at the time) but make sure the CURRENT row has something, so
    // the admin page and retailer pages have a number to show immediately.
    const [[latest]] = await pool.query(
      'SELECT id, default_price_per_kg, avg_weight_per_bird FROM pricing ORDER BY id DESC LIMIT 1'
    );

    if (!latest) {
      console.log('⚠️  pricing table is empty — run scripts/createTables.js first.');
    } else if (latest.avg_weight_per_bird === null) {
      const DEFAULT_AVG_WEIGHT = 1.8; // kg per bird — adjust to your real figure
      await pool.query('UPDATE pricing SET avg_weight_per_bird = ? WHERE id = ?', [
        DEFAULT_AVG_WEIGHT,
        latest.id,
      ]);
      console.log(
        `✅ Seeded current pricing row (id ${latest.id}) with ${DEFAULT_AVG_WEIGHT} kg/bird`
      );
    } else {
      console.log(`✅ Current row already has ${latest.avg_weight_per_bird} kg/bird`);
    }

    const [rows] = await pool.query(
      'SELECT id, default_price_per_kg, avg_weight_per_bird, updated_at FROM pricing ORDER BY id DESC LIMIT 3'
    );
    console.log('\n📋 Latest pricing rows:');
    console.table(rows);

    console.log('\n🎉 Done.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();