// Run once to add the "loading company" feature:
//   node scripts/createCompanyTables.js
//
// Creates the `companies` table, and adds the columns needed to track which
// company a trip loaded hens from, how much was loaded (hens + kg), and how
// many hens were delivered to each retailer (kg-delivered already existed).
// Safe to re-run — every step checks whether it's already done first.

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
    // 1. companies table
    const [companiesTable] = await pool.query(`SHOW TABLES LIKE 'companies'`);
    if (companiesTable.length === 0) {
      await pool.query(`
        CREATE TABLE companies (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(150) NOT NULL,
          phone VARCHAR(20),
          address VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_name (name)
        )
      `);
      console.log('✅ Created `companies` table.');
    } else {
      console.log('ℹ️  `companies` table already exists — skipped.');
    }

    // 2. trips.company_id — which company this trip loaded hens from
    const [companyIdCol] = await pool.query(`SHOW COLUMNS FROM trips LIKE 'company_id'`);
    if (companyIdCol.length === 0) {
      await pool.query(`
        ALTER TABLE trips
        ADD COLUMN company_id INT NULL AFTER driver_id,
        ADD CONSTRAINT fk_trips_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
        ADD INDEX idx_company_id (company_id)
      `);
      console.log('✅ Added `company_id` to `trips`.');
    } else {
      console.log('ℹ️  `trips.company_id` already exists — skipped.');
    }

    // 3. trips.total_loaded_kg — total weight loaded at the start of the trip
    //    (total_hens already existed and covers the hens-loaded side).
    const [loadedKgCol] = await pool.query(`SHOW COLUMNS FROM trips LIKE 'total_loaded_kg'`);
    if (loadedKgCol.length === 0) {
      await pool.query(`
        ALTER TABLE trips
        ADD COLUMN total_loaded_kg DECIMAL(10,2) DEFAULT 0 AFTER total_hens
      `);
      console.log('✅ Added `total_loaded_kg` to `trips`.');
    } else {
      console.log('ℹ️  `trips.total_loaded_kg` already exists — skipped.');
    }

    // 4. trip_orders.hens_delivered — hens delivered to this specific
    //    retailer (actual_delivered_kg already existed for the kg side).
    const [hensDeliveredCol] = await pool.query(`SHOW COLUMNS FROM trip_orders LIKE 'hens_delivered'`);
    if (hensDeliveredCol.length === 0) {
      await pool.query(`
        ALTER TABLE trip_orders
        ADD COLUMN hens_delivered INT DEFAULT 0 AFTER actual_delivered_kg
      `);
      console.log('✅ Added `hens_delivered` to `trip_orders`.');
    } else {
      console.log('ℹ️  `trip_orders.hens_delivered` already exists — skipped.');
    }

    console.log('🎉 Company/loading migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
};

run();