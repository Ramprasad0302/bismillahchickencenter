const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const hashPassword = async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(
      `UPDATE users SET password = ? WHERE phone = '9999999999'`,
      [hashedPassword]
    );
    
    console.log('✅ Password hashed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

hashPassword();