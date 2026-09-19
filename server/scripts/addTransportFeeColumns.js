// Adds transportation-fee-per-hen support across pricing, retailer_pricing,
// and orders. Safe to re-run -- every step checks first.
//   node scripts/addTransportFeeColumns.js

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
    const [pricingCol] = await pool.query(`SHOW COLUMNS FROM pricing LIKE 'transport_fee_per_hen'`);
    if (pricingCol.length === 0) {
      await pool.query(`ALTER TABLE pricing ADD COLUMN transport_fee_per_hen DECIMAL(10,2) DEFAULT 0 AFTER avg_weight_per_bird`);
      console.log('✅ Added `transport_fee_per_hen` to `pricing`.');
    } else {
      console.log('ℹ️  `pricing.transport_fee_per_hen` already exists — skipped.');
    }

    const [retailerPricingCol] = await pool.query(`SHOW COLUMNS FROM retailer_pricing LIKE 'custom_transport_fee_per_hen'`);
    if (retailerPricingCol.length === 0) {
      await pool.query(`ALTER TABLE retailer_pricing ADD COLUMN custom_transport_fee_per_hen DECIMAL(10,2) NULL DEFAULT NULL AFTER custom_price_per_kg`);
      console.log('✅ Added `custom_transport_fee_per_hen` to `retailer_pricing`.');
    } else {
      console.log('ℹ️  `retailer_pricing.custom_transport_fee_per_hen` already exists — skipped.');
    }

    const [orderRateCol] = await pool.query(`SHOW COLUMNS FROM orders LIKE 'transport_fee_per_hen'`);
    if (orderRateCol.length === 0) {
      await pool.query(`ALTER TABLE orders ADD COLUMN transport_fee_per_hen DECIMAL(10,2) DEFAULT 0 AFTER rate_per_kg`);
      console.log('✅ Added `transport_fee_per_hen` to `orders`.');
    } else {
      console.log('ℹ️  `orders.transport_fee_per_hen` already exists — skipped.');
    }

    const [orderFeeCol] = await pool.query(`SHOW COLUMNS FROM orders LIKE 'transport_fee'`);
    if (orderFeeCol.length === 0) {
      await pool.query(`ALTER TABLE orders ADD COLUMN transport_fee DECIMAL(10,2) DEFAULT 0 AFTER subtotal`);
      console.log('✅ Added `transport_fee` to `orders`.');
    } else {
      console.log('ℹ️  `orders.transport_fee` already exists — skipped.');
    }

    console.log('🎉 Transport fee migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();