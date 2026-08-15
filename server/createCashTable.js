const pool = require('./config/db');

const createCashTable = async () => {
  try {
    console.log('🛠️ Creating cash_verifications table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cash_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        trip_number VARCHAR(50) NOT NULL,
        total_cash_collected DECIMAL(10,2) NOT NULL,
        diesel_expense DECIMAL(10,2) DEFAULT 0,
        status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP NULL,
        FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
        INDEX idx_driver_id (driver_id),
        INDEX idx_status (status)
      )
    `);
    
    console.log('✅ cash_verifications table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    process.exit(1);
  }
};

createCashTable();