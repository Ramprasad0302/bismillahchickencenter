const pool = require('./db');

// ============================================
// Performance indexes
//
// The live database grew from several migration scripts and is missing
// indexes on the columns the dashboard, orders, trips and salary screens
// filter, join and sort on. Without them MySQL scans whole tables on every
// request, which is what made pages slow to load and refresh.
//
// Runs once at server start. Each index is only created if the table and
// column exist and no index already starts with that column, so it is safe
// to run on every boot and on databases with slightly different schemas.
// ============================================
const WANTED = [
  ['orders', 'created_at'],
  ['orders', 'retailer_id'],
  ['orders', 'trip_id'],
  ['orders', 'order_status'],
  ['orders', 'order_number'],
  ['trip_orders', 'order_id'],
  ['trip_orders', 'trip_id'],
  ['trips', 'driver_id'],
  ['trips', 'date'],
  ['trips', 'trip_number'],
  ['staff_trips', 'staff_id'],
  ['staff_trips', 'date'],
  ['payment_transactions', 'order_id'],
  ['payments', 'retailer_id'],
  ['payments', 'created_at'],
  ['retailers', 'user_id'],
  ['drivers', 'user_id'],
  ['salary_advances', 'date'],
];

const ensureIndexes = async () => {
  try {
    const [columns] = await pool.query(
      `SELECT TABLE_NAME AS t, COLUMN_NAME AS c
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()`
    );
    const [indexed] = await pool.query(
      `SELECT TABLE_NAME AS t, COLUMN_NAME AS c
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND SEQ_IN_INDEX = 1`
    );

    const has = new Set(columns.map((r) => `${r.t}.${r.c}`));
    const leading = new Set(indexed.map((r) => `${r.t}.${r.c}`));

    for (const [table, column] of WANTED) {
      const key = `${table}.${column}`;
      if (!has.has(key) || leading.has(key)) continue;
      try {
        await pool.query(`CREATE INDEX \`idx_perf_${column}\` ON \`${table}\` (\`${column}\`)`);
        console.log(`⚡ Added index ${key}`);
      } catch (error) {
        console.warn(`⚠️ Could not add index ${key}:`, error.message);
      }
    }
  } catch (error) {
    // Never block the server from starting over an optimisation.
    console.warn('⚠️ Index check skipped:', error.message);
  }
};

module.exports = ensureIndexes;
