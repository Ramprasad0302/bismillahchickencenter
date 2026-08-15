const mysql = require('mysql2/promise');
require('dotenv').config();

const createTables = async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit: 10,
    });

    console.log('📦 Connected to database...');

    // ============================================
    // 1. USERS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(15) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'retailer', 'driver', 'staff') NOT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_email (email),
        INDEX idx_role (role)
      )
    `);
    console.log('✅ Users table ready');

    // ============================================
    // 2. STAFF TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) UNIQUE NOT NULL,
        role ENUM('driver', 'cleaner', 'helper') NOT NULL,
        daily_salary DECIMAL(10,2) NOT NULL,
        status ENUM('active', 'inactive', 'on_leave') DEFAULT 'active',
        join_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_role (role)
      )
    `);
    console.log('✅ Staff table ready');

    // ============================================
    // 3. PRICING TABLE (Global Price)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id INT PRIMARY KEY AUTO_INCREMENT,
        default_price_per_kg DECIMAL(10,2) NOT NULL,
        updated_by VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Pricing table ready');

    // ============================================
    // 4. RETAILERS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS retailers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        shop_name VARCHAR(100) NOT NULL,
        owner_name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        email VARCHAR(100),
        address TEXT,
        area VARCHAR(50),
        city VARCHAR(50),
        pincode VARCHAR(10),
        credit_limit DECIMAL(10,2) DEFAULT 0,
        outstanding DECIMAL(10,2) DEFAULT 0,
        status ENUM('active', 'inactive') DEFAULT 'active',
        joined_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_phone (phone)
      )
    `);
    console.log('✅ Retailers table ready');

    // ============================================
    // 5. DRIVERS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        vehicle_number VARCHAR(20),
        vehicle_type VARCHAR(50),
        license_number VARCHAR(50),
        status ENUM('available', 'on_delivery', 'inactive') DEFAULT 'available',
        daily_salary DECIMAL(8,2) DEFAULT 0,
        joined_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_phone (phone)
      )
    `);
    console.log('✅ Drivers table ready');

    // ============================================
    // 6. VEHICLES TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id VARCHAR(20) UNIQUE,
        name VARCHAR(100) NOT NULL,
        number VARCHAR(30) UNIQUE NOT NULL,
        type VARCHAR(100) NOT NULL,
        capacity INT NOT NULL,
        fuel_type ENUM('Diesel', 'Petrol', 'CNG', 'Electric') DEFAULT 'Diesel',
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        today_trips INT DEFAULT 0,
        total_trips INT DEFAULT 0,
        last_maintenance DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Vehicles table ready');

    // ============================================
    // 7. ORDERS TABLE - CREATE IF NOT EXISTS + ALTER
    // ============================================
    
    // First, create the table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_number VARCHAR(20) UNIQUE NOT NULL,
        retailer_id INT NOT NULL,
        kg_ordered DECIMAL(10,2) NOT NULL,
        kg_delivered DECIMAL(10,2) DEFAULT 0,
        rate_per_kg DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        delivery_charge DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        balance DECIMAL(10,2) DEFAULT 0,
        payment_status ENUM('paid', 'partial', 'pending') DEFAULT 'pending',
        order_status ENUM('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
        driver_id INT NULL,
        trip_id INT NULL,
        delivery_address TEXT,
        order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_date DATE NULL,
        FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
        INDEX idx_order_number (order_number),
        INDEX idx_retailer_id (retailer_id),
        INDEX idx_driver_id (driver_id),
        INDEX idx_order_status (order_status),
        INDEX idx_payment_status (payment_status),
        INDEX idx_order_date (order_date)
      )
    `);
    console.log('✅ Orders table created or already exists');

    // ============================================
    // NOW ADD MISSING COLUMNS USING ALTER TABLE
    // ============================================
    console.log('📝 Checking for missing columns in orders table...');

    // Get existing columns
    const [columns] = await pool.query('DESCRIBE orders');
    const columnNames = columns.map(col => col.Field);
    console.log('📊 Existing columns:', columnNames);

    // Check and add payment_method
    if (!columnNames.includes('payment_method')) {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN payment_method ENUM('upi', 'cash', 'bank_transfer', 'cheque', 'pending') 
        DEFAULT 'pending' 
        AFTER balance
      `);
      console.log('✅ Added payment_method column');
    }

    // Check and add notes
    if (!columnNames.includes('notes')) {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN notes TEXT 
        AFTER delivery_address
      `);
      console.log('✅ Added notes column');
    }

    // Check and add upi_transaction_id
    if (!columnNames.includes('upi_transaction_id')) {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN upi_transaction_id VARCHAR(100) 
        AFTER payment_method
      `);
      console.log('✅ Added upi_transaction_id column');
    }

    // Check and add created_at
    if (!columnNames.includes('created_at')) {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added created_at column');
    }

    // Check and add updated_at
    if (!columnNames.includes('updated_at')) {
      await pool.query(`
        ALTER TABLE orders 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column');
    }

    // Fix balance column if it's named incorrectly
    if (columnNames.includes('balance_payment_status')) {
      await pool.query(`
        ALTER TABLE orders 
        CHANGE COLUMN balance_payment_status balance DECIMAL(10,2) DEFAULT 0
      `);
      console.log('✅ Fixed balance column name');
    }

    // Add indexes
    try {
      await pool.query(`CREATE INDEX idx_payment_method ON orders(payment_method)`);
      console.log('✅ Added idx_payment_method index');
    } catch (e) {
      // Index might already exist
    }

    try {
      await pool.query(`CREATE INDEX idx_orders_created_at ON orders(created_at DESC)`);
      console.log('✅ Added idx_orders_created_at index');
    } catch (e) {
      // Index might already exist
    }

    console.log('✅ Orders table is now complete with all columns');

    // ============================================
    // 8. TRIPS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id INT PRIMARY KEY AUTO_INCREMENT,
        trip_number VARCHAR(20) UNIQUE NOT NULL,
        driver_id INT NOT NULL,
        total_hens INT DEFAULT 0,
        total_kg DECIMAL(10,2) DEFAULT 0,
        diesel_amount DECIMAL(10,2) DEFAULT 0,
        diesel_photo VARCHAR(255),
        status ENUM('assigned', 'in_progress', 'completed') DEFAULT 'assigned',
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        INDEX idx_driver_id (driver_id),
        INDEX idx_trip_number (trip_number)
      )
    `);
    console.log('✅ Trips table ready');

    // ============================================
    // 9. TRIP ORDERS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trip_orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        trip_id INT NOT NULL,
        order_id INT NOT NULL,
        actual_delivered_kg DECIMAL(10,2) DEFAULT 0,
        cash_collected DECIMAL(10,2) DEFAULT 0,
        delivered_status ENUM('pending', 'delivered') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_trip_id (trip_id),
        INDEX idx_order_id (order_id)
      )
    `);
    console.log('✅ Trip Orders table ready');

    // ============================================
    // 10. STAFF TRIPS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_trips (
        id INT PRIMARY KEY AUTO_INCREMENT,
        staff_id INT NOT NULL,
        trip_id INT NOT NULL,
        role ENUM('driver', 'cleaner', 'helper') NOT NULL,
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
        INDEX idx_staff_id (staff_id),
        INDEX idx_trip_id (trip_id)
      )
    `);
    console.log('✅ Staff Trips table ready');

    // ============================================
    // 11. PAYMENTS TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        payment_number VARCHAR(20) UNIQUE NOT NULL,
        retailer_id INT NOT NULL,
        order_id INT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method ENUM('cash', 'upi', 'bank_transfer', 'cheque') NOT NULL,
        status ENUM('pending', 'partial', 'paid', 'verified') DEFAULT 'pending',
        collected_by VARCHAR(50),
        collected_by_role ENUM('admin', 'driver') DEFAULT 'admin',
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_by VARCHAR(50),
        verified_at TIMESTAMP NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        INDEX idx_payment_number (payment_number),
        INDEX idx_retailer_id (retailer_id),
        INDEX idx_order_id (order_id),
        INDEX idx_status (status),
        INDEX idx_payments_retailer_date (retailer_id, date DESC)
      )
    `);
    console.log('✅ Payments table ready');

    // ============================================
    // 12. LEDGER TABLE (Newly Added)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ledger (
        id INT PRIMARY KEY AUTO_INCREMENT,
        retailer_id INT NOT NULL,
        order_id INT NULL,
        payment_id INT NULL,
        type ENUM('debit', 'credit') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255),
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
        INDEX idx_retailer_id (retailer_id),
        INDEX idx_order_id (order_id),
        INDEX idx_payment_id (payment_id)
      )
    `);
    console.log('✅ Ledger table ready');

    // ============================================
    // 13. EXPENSES TABLE
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        date DATE,
        recorded_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category)
      )
    `);
    console.log('✅ Expenses table ready');

    // ============================================
    // 14. RETAILER PRICING TABLE (Newly Added for Custom Prices)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS retailer_pricing (
        id INT PRIMARY KEY AUTO_INCREMENT,
        retailer_id INT NOT NULL,
        custom_price_per_kg DECIMAL(10,2) NOT NULL,
        updated_by VARCHAR(50),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
        INDEX idx_retailer_id (retailer_id)
      )
    `);
    console.log('✅ Retailer Pricing table ready');

    // ============================================
    // DEFAULT DATA
    // ============================================

    // Admin user.
    // The old version inserted the literal string '$2a$10$YourHashedPasswordHere'
    // as the password hash. bcrypt.compare() can never match that, so the
    // seeded admin could not log in. A real hash is generated instead.
    const [adminCheck] = await pool.query(`SELECT id FROM users WHERE phone = '9999999999'`);
    if (adminCheck.length === 0) {
      const bcrypt = require('bcryptjs');
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;

      if (!initialPassword) {
        console.warn('⚠️  No admin user created. Set ADMIN_INITIAL_PASSWORD in .env and re-run,');
        console.warn('    or run: node scripts/createAdmin.js');
      } else {
        const hash = await bcrypt.hash(initialPassword, 10);
        await pool.query(
          `INSERT INTO users (name, phone, password, role, status)
           VALUES ('Mohammed Admin', '9999999999', ?, 'admin', 'active')`,
          [hash]
        );
        console.log('✅ Admin user created (phone 9999999999)');
        console.log('⚠️  Change that password after your first login.');
      }
    } else {
      console.log('✅ Admin user already exists');
    }

    // Insert default global pricing
    const [pricingCheck] = await pool.query(`SELECT id FROM pricing LIMIT 1`);
    if (pricingCheck.length === 0) {
      await pool.query(`
        INSERT INTO pricing (default_price_per_kg, updated_by) 
        VALUES (188.00, 'System')
      `);
      console.log('✅ Default pricing created');
    } else {
      console.log('✅ Default pricing already exists');
    }

    console.log('\n🎉 All tables are ready!');
    console.log('📊 Orders table has been updated with all required columns');
    console.log('💰 Retailer Pricing table added for custom per-user prices');
    console.log('📒 Ledger table added for financial tracking');
    
    // Show final table structure
    const [finalColumns] = await pool.query('DESCRIBE orders');
    console.log('\n📋 Final Orders Table Structure:');
    finalColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type}`);
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('❌ Details:', error.stack);
    process.exit(1);
  }
};

createTables();