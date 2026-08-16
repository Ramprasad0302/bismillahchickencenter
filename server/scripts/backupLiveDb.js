// ============================================
// backupLiveDb.js
//
// Dumps EVERY table from the database this app is actually connected to
// (srv787.hstgr.io / in-mum-web787) into a single .sql file you can import
// anywhere. Uses the mysql2 pool the project already has, so it needs no
// extra dependencies and no phpMyAdmin access.
//
//   Place in:  server/scripts/backupLiveDb.js
//   Run from:  server/     ->  node scripts/backupLiveDb.js
//
// Output: server/backup-<database>-<timestamp>.sql
// ============================================
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const esc = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v)) return `0x${v.toString('hex')}`;
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `'${v.getUTCFullYear()}-${p(v.getUTCMonth() + 1)}-${p(v.getUTCDate())} ` +
           `${p(v.getUTCHours())}:${p(v.getUTCMinutes())}:${p(v.getUTCSeconds())}'`;
  }
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'object') return `'${String(JSON.stringify(v)).replace(/[\\'"]/g, (c) => '\\' + c)}'`;
  return `'${String(v).replace(/[\0\b\t\n\r\x1a\\'"]/g, (c) => (
    { '\0': '\\0', '\b': '\\b', '\t': '\\t', '\n': '\\n',
      '\r': '\\r', '\x1a': '\\Z' }[c] || '\\' + c
  ))}'`;
};

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    multipleStatements: false,
  });

  const [[info]] = await conn.query(
    'SELECT DATABASE() AS db, @@hostname AS host, VERSION() AS version'
  );
  console.log(`Connected to ${info.db} on ${info.host} (${info.version})`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(__dirname, '..', `backup-${info.db}-${stamp}.sql`);
  const out = fs.createWriteStream(outPath, { encoding: 'utf8' });
  const write = (s) => new Promise((r) => (out.write(s) ? r() : out.once('drain', r)));

  await write(
    `-- Backup of ${info.db}\n-- Source host: ${info.host}\n` +
    `-- Taken: ${new Date().toISOString()}\n\n` +
    `SET FOREIGN_KEY_CHECKS=0;\nSET NAMES utf8mb4;\nSTART TRANSACTION;\n\n`
  );

  const [tables] = await conn.query(
    `SELECT table_name AS t FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE'
      ORDER BY table_name`,
    [info.db]
  );

  let grandTotal = 0;

  for (const { t } of tables) {
    const [[create]] = await conn.query(`SHOW CREATE TABLE \`${t}\``);
    await write(
      `-- ------------------------------------\n-- Table: ${t}\n` +
      `-- ------------------------------------\nDROP TABLE IF EXISTS \`${t}\`;\n` +
      `${create['Create Table']};\n\n`
    );

    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
    grandTotal += n;

    if (n > 0) {
      const [cols] = await conn.query(
        `SELECT column_name AS c FROM information_schema.columns
          WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position`,
        [info.db, t]
      );
      const colList = cols.map((c) => `\`${c.c}\``).join(', ');

      const CHUNK = 200;
      for (let offset = 0; offset < n; offset += CHUNK) {
        const [rows] = await conn.query(
          `SELECT * FROM \`${t}\` LIMIT ${CHUNK} OFFSET ${offset}`
        );
        const values = rows
          .map((row) => `(${cols.map((c) => esc(row[c.c])).join(', ')})`)
          .join(',\n  ');
        await write(`INSERT INTO \`${t}\` (${colList}) VALUES\n  ${values};\n`);
      }
      await write('\n');
    }

    console.log(`  ${t.padEnd(28)} ${String(n).padStart(6)} rows`);
  }

  await write('COMMIT;\nSET FOREIGN_KEY_CHECKS=1;\n');
  await new Promise((r) => out.end(r));
  await conn.end();

  const size = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`\nDone. ${tables.length} tables, ${grandTotal} rows, ${size} KB`);
  console.log(`Saved to: ${outPath}`);
})().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});