const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
<<<<<<< HEAD
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
=======
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de

// Login user
const login = async (req, res) => {
  try {
<<<<<<< HEAD
    console.log('🔐 Login attempt for phone:', req.body?.phone);
=======
    console.log('🔐 Login attempt:', req.body);
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    const { phone, password } = req.body;
    
    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required'
      });
    }
    
    // Find user by phone
    const [users] = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }
    
    const user = users[0];
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Your account is inactive. Please contact administrator.'
      });
    }
    
    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );
    
<<<<<<< HEAD
    // Generate JWT token (secret comes from config/jwt.js, which refuses to
    // start without a real JWT_SECRET)
=======
    // ✅ ADD DEBUG LOGS HERE
    const JWT_SECRET = process.env.JWT_SECRET || 'bismilla_chicken_center_2026_super_secret_key';
    
    console.log('=================================');
    console.log('🔑 SIGN SECRET:', JWT_SECRET);
    console.log('=================================');
    
    // Generate JWT token
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    const token = jwt.sign(
      { 
        id: user.id, 
        phone: user.phone, 
        role: user.role,
        name: user.name 
      },
      JWT_SECRET,
<<<<<<< HEAD
      { expiresIn: JWT_EXPIRES_IN }
    );
    
=======
      { expiresIn: '7d' }
    );
    
    console.log('✅ Generated Token:');
    console.log(token);
    console.log('=================================');
    
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    console.log(`✅ User logged in: ${user.name} (${user.role})`);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
<<<<<<< HEAD
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
=======
      error: error.message
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    });
  }
};

// Get current user info
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const [users] = await pool.query(
      'SELECT id, name, phone, email, role, status, last_login FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: users[0]
    });
  } catch (error) {
    console.error('❌ Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user info',
      error: error.message
    });
  }
};

module.exports = {
  login,
  getCurrentUser
};