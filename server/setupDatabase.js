<<<<<<< HEAD
// ⚠️  This script used to create a table called `ledgers` (plural), while
// scripts/createTables.js creates `ledger` (singular). Running both left the
// database with two ledger tables and the app writing to whichever name the
// particular file happened to use.
//
// The codebase now uses `ledger` everywhere. If you already ran the old
// version of this file, run scripts/migrateLedger.js to fold the rows from
// `ledgers` into `ledger`.
//
// Prefer: node scripts/createTables.js

const pool = require('./config/db');

const createLedgerTable = async () => {
  try {
    console.log('🛠️  Ensuring the ledger table exists...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        retailer_id INT NOT NULL,
        order_id INT DEFAULT NULL,
        payment_id INT DEFAULT NULL,
        type ENUM('debit', 'credit') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description VARCHAR(255) DEFAULT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
        INDEX idx_retailer_id (retailer_id)
      )
    `);

    console.log('✅ ledger table ready');

    const [plural] = await pool.query(`SHOW TABLES LIKE 'ledgers'`);
    if (plural.length > 0) {
      console.warn('⚠️  A legacy `ledgers` table is still present.');
      console.warn('    Run: node scripts/migrateLedger.js');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating ledger table:', error.message);
    process.exit(1);
  }
};

createLedgerTable();
=======
const pool = require('./config/db'); // Make sure this path matches your actual db config file

const createLedgersTable = async () => {
    try {
        console.log('🛠️ Checking if ledgers table exists...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ledgers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                retailer_id INT NOT NULL,
                order_id INT DEFAULT NULL,
                type ENUM('debit', 'credit') NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                description VARCHAR(255) DEFAULT NULL,
                date DATE DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ ledgers table created successfully! (or it already existed)');
        process.exit(0); // Exit the script successfully

    } catch (error) {
        console.error('❌ Error creating ledgers table:', error.message);
        process.exit(1); // Exit the script with failure
    }
};

createLedgersTable();
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
