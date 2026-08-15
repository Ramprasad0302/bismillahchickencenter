// Run once:  node scripts/createPaymentTables.js
// Safe to re-run.

const mysql = require('mysql2/promise');
require('dotenv').config();

const LEDGER_TABLE = process.env.LEDGER_TABLE || 'ledger';

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
    console.log('📦 Connected.');

    // ------------------------------------------------
    // 1. payment_transactions — one row per checkout attempt
    // ------------------------------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        reference VARCHAR(40) UNIQUE NOT NULL,
        retailer_id INT NOT NULL,
        order_id INT NULL,
        provider VARCHAR(20) NOT NULL,
        provider_session_id VARCHAR(255) NULL,
        provider_payment_id VARCHAR(255) NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status ENUM('created','pending','success','failed','cancelled') DEFAULT 'created',
        settled TINYINT(1) DEFAULT 0,
        payment_id INT NULL,
        allocations JSON NULL,
        failure_reason VARCHAR(255) NULL,
        raw_payload JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
        INDEX idx_reference (reference),
        INDEX idx_retailer (retailer_id),
        INDEX idx_status (status),
        INDEX idx_session (provider_session_id),
        UNIQUE KEY uniq_provider_payment (provider, provider_payment_id)
      )
    `);
    console.log('✅ payment_transactions ready');

    // ------------------------------------------------
    // 2. payments.method needs an "online" option
    // ------------------------------------------------
    const [methodCol] = await pool.query(`SHOW COLUMNS FROM payments LIKE 'method'`);
    if (methodCol.length && !methodCol[0].Type.includes("'online'")) {
      await pool.query(`
        ALTER TABLE payments
        MODIFY COLUMN method ENUM('cash','upi','bank_transfer','cheque','online') NOT NULL
      `);
      console.log('✅ payments.method now accepts "online"');
    } else {
      console.log('✅ payments.method already accepts "online"');
    }

    // Same for orders.payment_method, so an order paid online reads correctly.
    const [orderMethodCol] = await pool.query(`SHOW COLUMNS FROM orders LIKE 'payment_method'`);
    if (orderMethodCol.length && !orderMethodCol[0].Type.includes("'online'")) {
      await pool.query(`
        ALTER TABLE orders
        MODIFY COLUMN payment_method ENUM('upi','cash','bank_transfer','cheque','online','pending')
        DEFAULT 'pending'
      `);
      console.log('✅ orders.payment_method now accepts "online"');
    }

    // ------------------------------------------------
    // 3. Ledger table sanity check
    // ------------------------------------------------
    const [ledgerExists] = await pool.query(`SHOW TABLES LIKE ?`, [LEDGER_TABLE]);
    if (ledgerExists.length === 0) {
      console.warn(
        `⚠️  Table "${LEDGER_TABLE}" does not exist. Run scripts/createTables.js first, or set LEDGER_TABLE in .env to whatever yours is called.`
      );
    } else {
      console.log(`✅ Ledger table "${LEDGER_TABLE}" found`);
    }

    // Heads-up on the naming mismatch that already exists in the codebase.
    const [singular] = await pool.query(`SHOW TABLES LIKE 'ledger'`);
    const [plural] = await pool.query(`SHOW TABLES LIKE 'ledgers'`);
    if (singular.length && plural.length) {
      console.warn('⚠️  Both "ledger" and "ledgers" exist. Pick one and fix orderController.recordPayment.');
    }

    console.log('\n🎉 Payment tables ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();
