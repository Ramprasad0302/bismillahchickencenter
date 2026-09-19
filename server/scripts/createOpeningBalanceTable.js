// Creates the retailer_opening_balances table and migrates any legacy
// "OPEN-..." synthetic orders (an earlier, since-abandoned approach) into it.
//   node scripts/createOpeningBalanceTable.js
//
// One row per retailer. `remaining_amount` is what's actually still owed
// from before the shop was entered into this system -- it only ever goes
// down, as payments are applied against it (always before any regular
// bill, per the FIFO rule: it's the oldest debt).

const mysql = require('mysql2/promise');
require('dotenv').config();

const run = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 5,
  });

  try {
    const [existing] = await pool.query(`SHOW TABLES LIKE 'retailer_opening_balances'`);
    if (existing.length === 0) {
      await pool.query(`
        CREATE TABLE retailer_opening_balances (
          id INT PRIMARY KEY AUTO_INCREMENT,
          retailer_id INT NOT NULL,
          original_amount DECIMAL(10,2) NOT NULL,
          remaining_amount DECIMAL(10,2) NOT NULL,
          notes VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
          UNIQUE KEY uniq_retailer (retailer_id),
          INDEX idx_retailer_id (retailer_id)
        )
      `);
      console.log('✅ Created `retailer_opening_balances` table.');
    } else {
      console.log('ℹ️  `retailer_opening_balances` already exists — skipped.');
    }

    // Migrate any old "OPEN-..." synthetic orders (the earlier approach)
    // into the new table, then remove them so they aren't counted twice.
    const [legacyOrders] = await pool.query(
      `SELECT id, retailer_id, balance, total_amount FROM orders WHERE order_number LIKE 'OPEN-%'`
    );

    for (const row of legacyOrders) {
      const [already] = await pool.query(
        'SELECT id FROM retailer_opening_balances WHERE retailer_id = ?',
        [row.retailer_id]
      );
      if (already.length === 0) {
        await pool.query(
          `INSERT INTO retailer_opening_balances (retailer_id, original_amount, remaining_amount, notes)
           VALUES (?, ?, ?, 'Migrated from legacy opening-balance order')`,
          [row.retailer_id, row.total_amount, row.balance]
        );
        console.log(`✅ Migrated opening balance for retailer ${row.retailer_id}: ₹${row.balance} remaining`);
      }
      await pool.query('DELETE FROM orders WHERE id = ?', [row.id]);
    }
    if (legacyOrders.length > 0) {
      console.log(`✅ Migrated and removed ${legacyOrders.length} legacy opening-balance order(s).`);
    } else {
      console.log('ℹ️  No legacy opening-balance orders found to migrate.');
    }

    // Re-sync every retailer's outstanding to include the opening balance now.
    await pool.query(`
      UPDATE retailers r
      SET r.outstanding = (
        COALESCE((SELECT remaining_amount FROM retailer_opening_balances WHERE retailer_id = r.id), 0) +
        COALESCE((SELECT SUM(balance) FROM orders WHERE retailer_id = r.id AND order_status != 'cancelled' AND balance >= 1), 0)
      )
    `);
    console.log('✅ Retailer outstanding balances re-synced.');

    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();