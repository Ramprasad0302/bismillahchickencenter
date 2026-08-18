// ============================================
// addTripExpenseColumns.js
//
// Adds trip_id and photo_url to the expenses table, so per-trip costs
// (loading, food, diesel) can be recorded against the trip that generated
// them and, where relevant, carry a bill photo.
//
//   Place in:  server/scripts/addTripExpenseColumns.js
//   Run from:  server/     ->  node scripts/addTripExpenseColumns.js
//
// Safe to run more than once.
// ============================================
require('dotenv').config();

const pool = require('../config/db');

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows.length > 0;
}

(async () => {
  try {
    console.log('📦 Connected.');

    if (await columnExists('expenses', 'trip_id')) {
      console.log('✅ expenses.trip_id already exists');
    } else {
      await pool.query(
        `ALTER TABLE expenses
           ADD COLUMN trip_id INT NULL AFTER category,
           ADD INDEX idx_expenses_trip_id (trip_id),
           ADD CONSTRAINT fk_expenses_trip
             FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL`
      );
      console.log('✅ Added expenses.trip_id (FK -> trips.id)');
    }

    if (await columnExists('expenses', 'photo_url')) {
      console.log('✅ expenses.photo_url already exists');
    } else {
      await pool.query(
        `ALTER TABLE expenses ADD COLUMN photo_url VARCHAR(255) NULL AFTER amount`
      );
      console.log('✅ Added expenses.photo_url');
    }

    console.log('\n🎉 Done.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();