-- ============================================
-- Bismilla Chicken Center — database schema
--
-- This file was empty; the real schema lived only in
-- server/scripts/createTables.js. It is reproduced here so the structure is
-- reviewable without running Node.
--
-- To apply:  mysql -u <user> -p <database> < database/schema.sql
-- Or run:    cd server && node scripts/createTables.js
--                     && node scripts/createPaymentTables.js
-- ============================================

-- ============================================
-- 1. USERS
-- ============================================
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
);

-- ============================================
-- 2. STAFF
-- ============================================
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
);

-- ============================================
-- 3. PRICING (global default rate)
-- ============================================
CREATE TABLE IF NOT EXISTS pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  default_price_per_kg DECIMAL(10,2) NOT NULL,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 4. RETAILERS
-- ============================================
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
);

-- ============================================
-- 5. DRIVERS
-- ============================================
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
);

-- ============================================
-- 6. VEHICLES
-- ============================================
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
);

-- ============================================
-- 7. ORDERS
-- 'online' added to payment_method for gateway payments.
-- ============================================
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
  payment_method ENUM('upi','cash','bank_transfer','cheque','online','pending') DEFAULT 'pending',
  upi_transaction_id VARCHAR(100),
  payment_status ENUM('paid', 'partial', 'pending') DEFAULT 'pending',
  order_status ENUM('pending','confirmed','processing','out_for_delivery','delivered','cancelled') DEFAULT 'pending',
  driver_id INT NULL,
  trip_id INT NULL,
  delivery_address TEXT,
  notes TEXT,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
  INDEX idx_order_number (order_number),
  INDEX idx_retailer_id (retailer_id),
  INDEX idx_driver_id (driver_id),
  INDEX idx_order_status (order_status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_payment_method (payment_method),
  INDEX idx_order_date (order_date)
);

-- ============================================
-- 8. TRIPS
-- ============================================
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
);

-- ============================================
-- 9. TRIP ORDERS
-- ============================================
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
);

-- ============================================
-- 10. STAFF TRIPS
-- ============================================
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
);

-- ============================================
-- 11. PAYMENTS
-- 'online' added to method for gateway payments.
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payment_number VARCHAR(20) UNIQUE NOT NULL,
  retailer_id INT NOT NULL,
  order_id INT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method ENUM('cash', 'upi', 'bank_transfer', 'cheque', 'online') NOT NULL,
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
);

-- ============================================
-- 12. LEDGER
-- Singular. The old orderController.recordPayment wrote to `ledgers`, which was
-- never created anywhere — that is why admin payments were failing.
-- ============================================
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
);

-- ============================================
-- 13. EXPENSES
-- ============================================
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
);

-- ============================================
-- 14. RETAILER PRICING (per-retailer override)
-- ============================================
CREATE TABLE IF NOT EXISTS retailer_pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  retailer_id INT NOT NULL,
  custom_price_per_kg DECIMAL(10,2) NOT NULL,
  updated_by VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (retailer_id) REFERENCES retailers(id) ON DELETE CASCADE,
  INDEX idx_retailer_id (retailer_id)
);

-- ============================================
-- 15. PAYMENT TRANSACTIONS (online gateway)
-- One row per checkout attempt. `reference` is ours; provider_* are the
-- gateway's. `settled` is what makes webhook replays idempotent.
-- ============================================
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
);

-- ============================================
-- Seed: global price only.
-- The admin user is deliberately NOT seeded here. The original
-- createTables.js inserted the literal string '$2a$10$YourHashedPasswordHere'
-- as the password hash, which can never match any password. Create the admin
-- properly with:  cd server && node scripts/createAdmin.js
-- ============================================
INSERT INTO pricing (default_price_per_kg, updated_by)
SELECT 188.00, 'System'
WHERE NOT EXISTS (SELECT 1 FROM pricing);
