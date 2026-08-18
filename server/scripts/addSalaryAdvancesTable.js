// ============================================
// addSalaryAdvancesTable.js
//
// Creates salary_advances — the record of money paid out to a driver or
// staff member DURING a month, ahead of their full salary being settled
// (an "advance"). This is the only salary data that needs to be stored:
// days worked and base salary earned are computed live from trips /
// staff_trips whenever needed, since those dates are permanent history and
// recalculating from them can never go stale.
//
// staff_type + staff_ref_id is a polymorphic reference — drivers and staff
// (cleaners/helpers) live in two separate tables (drivers, staff) with
// their own auto-increment IDs, so a single normal foreign key can't point
// at "whichever table this is." staff_ref_id is validated against the
// correct table in the controller instead.
//
//   Place in:  server/scripts/addSalaryAdvancesTable.js
//   Run from:  server/     ->  node scripts/addSalaryAdvancesTable.js
//
// Safe to run more than once.
// ============================================
require('dotenv').config();

const pool = require('../config/db');

(async () => {
  try {
    console.log('📦 Connected.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary_advances (
        id INT PRIMARY KEY AUTO_INCREMENT,
        staff_type ENUM('driver', 'staff') NOT NULL,
        staff_ref_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        date DATE NOT NULL,
        note VARCHAR(255) NULL,
        recorded_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_staff (staff_type, staff_ref_id),
        INDEX idx_date (date)
      )
    `);
    console.log('✅ salary_advances table ready');

    console.log('\n🎉 Done.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
})();
