// Run once if your database has BOTH `ledger` and `ledgers`:
//   node scripts/migrateLedger.js
//
// Copies every row from the legacy `ledgers` table into `ledger`, then renames
// `ledgers` to `ledgers_backup` so nothing is destroyed. Safe to re-run — rows
// already carried over are skipped by their original id.

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
    const [legacy] = await pool.query(`SHOW TABLES LIKE 'ledgers'`);
    if (legacy.length === 0) {
      console.log('✅ No legacy `ledgers` table. Nothing to do.');
      process.exit(0);
    }

    const [target] = await pool.query(`SHOW TABLES LIKE 'ledger'`);
    if (target.length === 0) {
      console.log('ℹ️  `ledger` does not exist yet — renaming `ledgers` to `ledger`.');
      await pool.query('RENAME TABLE ledgers TO ledger');
      console.log('✅ Done.');
      process.exit(0);
    }

    const [rows] = await pool.query('SELECT * FROM ledgers ORDER BY id ASC');
    console.log(`📦 ${rows.length} row(s) in the legacy table.`);

    // Which columns does the target actually have?
    const [cols] = await pool.query('DESCRIBE ledger');
    const targetCols = new Set(cols.map((c) => c.Field));

    let moved = 0;
    let skipped = 0;

    for (const row of rows) {
      // Don't duplicate a row that was already carried over.
      const [existing] = await pool.query(
        `SELECT id FROM ledger
          WHERE retailer_id = ? AND amount = ? AND type = ?
            AND COALESCE(description,'') = COALESCE(?,'')
            AND DATE(created_at) = DATE(?)
          LIMIT 1`,
        [row.retailer_id, row.amount, row.type, row.description, row.created_at]
      );
      if (existing.length > 0) {
        skipped += 1;
        continue;
      }

      const usable = Object.keys(row).filter(
        (k) => k !== 'id' && targetCols.has(k) && row[k] !== undefined
      );
      const placeholders = usable.map(() => '?').join(', ');
      const columnList = usable.map((c) => `\`${c}\``).join(', ');

      await pool.query(
        `INSERT INTO ledger (${columnList}) VALUES (${placeholders})`,
        usable.map((c) => row[c])
      );
      moved += 1;
    }

    console.log(`✅ Moved ${moved}, skipped ${skipped} already present.`);

    const [backup] = await pool.query(`SHOW TABLES LIKE 'ledgers_backup'`);
    if (backup.length === 0) {
      await pool.query('RENAME TABLE ledgers TO ledgers_backup');
      console.log('📁 Legacy table renamed to `ledgers_backup` (nothing deleted).');
    } else {
      console.log('ℹ️  `ledgers_backup` already exists — left `ledgers` in place.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();
