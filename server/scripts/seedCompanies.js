// Run once to add placeholder companies for the driver dropdown:
//   node scripts/seedCompanies.js
//
// Only inserts if the table is empty, so it's safe to re-run — it will
// never create duplicates on a second run.

const mysql = require('mysql2/promise');
require('dotenv').config();

const PLACEHOLDER_COMPANIES = [
  'Company 1',
  'Company 2',
  'Company 3',
  'Company 4',
  'Company 5',
];

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
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM companies');
    if (existing[0].cnt > 0) {
      console.log(`ℹ️  \`companies\` already has ${existing[0].cnt} row(s) — skipped seeding.`);
      process.exit(0);
    }

    for (const name of PLACEHOLDER_COMPANIES) {
      await pool.query('INSERT INTO companies (name, is_active) VALUES (?, TRUE)', [name]);
    }
    console.log(`✅ Added ${PLACEHOLDER_COMPANIES.length} placeholder companies. Rename them any time — from phpMyAdmin, or ask me for an admin page to edit them later.`);
    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();