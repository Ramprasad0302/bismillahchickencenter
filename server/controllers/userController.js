const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    console.log('📋 Fetching all users...');
    const [rows] = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        email,
        role,
        status,
        last_login as lastLogin,
        DATE_FORMAT(created_at, '%d %b %Y') as createdAt
      FROM users 
      ORDER BY id DESC
    `);
    
    console.log(`✅ Found ${rows.length} users`);
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        email,
        role,
        status,
        last_login as lastLogin,
        DATE_FORMAT(created_at, '%d %b %Y') as createdAt
      FROM users 
      WHERE id = ?
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Create new user with automatic profile creation
const createUser = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    console.log('➕ Creating new user:', req.body);
    const { name, email, phone, role, password, openingOutstanding } = req.body;
    
    // Validate input
    if (!name || !phone || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, role, and password are required'
      });
    }

    // Opening outstanding is optional and only meaningful for retailers --
    // used to carry over a balance a shop already owed from before they
    // were entered into this system (from the old Excel records).
    let openingOutstandingAmount = 0;
    if (openingOutstanding !== undefined && openingOutstanding !== null && openingOutstanding !== '') {
      openingOutstandingAmount = parseFloat(openingOutstanding);
      if (Number.isNaN(openingOutstandingAmount) || openingOutstandingAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Opening outstanding must be a number 0 or greater',
        });
      }
    }
    
    // Start transaction
    await connection.beginTransaction();
    
    // Check if phone already exists
    const [existingPhone] = await connection.query(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );
    
    if (existingPhone.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }
    
    // Check if email exists (if provided)
    if (email) {
      const [existingEmail] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );
      
      if (existingEmail.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user
    const [result] = await connection.query(`
      INSERT INTO users (name, email, phone, password, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `, [name, email, phone, hashedPassword, role]);
    
    const userId = result.insertId;
    console.log(`✅ User created with ID: ${userId}`);
    
    // ✅ AUTOMATICALLY CREATE PROFILE BASED ON ROLE
    if (role === 'retailer') {
      // Create retailer profile
      const [retailerResult] = await connection.query(`
        INSERT INTO retailers (
          user_id,
          owner_name,
          shop_name,
          phone,
          email,
          address,
          area,
          city,
          pincode,
          credit_limit,
          outstanding,
          status,
          joined_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      `, [
        userId,
        name,
        `${name}'s Shop`,
        phone,
        email || null,
        null,  // address
        null,  // area
        null,  // city
        null,  // pincode
        50000, // default credit limit
        0,     // outstanding balance -- set below if there's an opening amount
        'active'
      ]);
      const retailerId = retailerResult.insertId;
      console.log(`✅ Retailer profile created for ${name}`);

      // If an opening outstanding amount was entered, record it in its own
      // table rather than as a synthetic order -- this is the amount a
      // shop already owed before being entered into this system, and it
      // needs to behave as its own distinct, oldest debt: added to (never
      // lost when) later orders come in, and paid off before any regular
      // bill when a payment is recorded.
      if (openingOutstandingAmount > 0) {
        await connection.query(
          `INSERT INTO retailer_opening_balances (retailer_id, original_amount, remaining_amount, notes)
           VALUES (?, ?, ?, ?)`,
          [
            retailerId,
            openingOutstandingAmount,
            openingOutstandingAmount,
            'Opening balance carried over from previous records',
          ]
        );

        await connection.query(
          `UPDATE retailers SET outstanding = ? WHERE id = ?`,
          [openingOutstandingAmount, retailerId]
        );
        console.log(`💰 Opening outstanding of ₹${openingOutstandingAmount} recorded for ${name}`);
      }
      
    } else if (role === 'driver') {
      // Create driver profile
      await connection.query(`
        INSERT INTO drivers (
          user_id,
          name,
          phone,
          vehicle_number,
          vehicle_type,
          license_number,
          status,
          daily_salary,
          joined_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      `, [
        userId,
        name,
        phone,
        null,  // vehicle_number (to be added later)
        null,  // vehicle_type (to be added later)
        null,  // license_number (to be added later)
        'available',
        0      // daily_salary (to be set later)
      ]);
      console.log(`✅ Driver profile created for ${name}`);
    }
    
    // Commit transaction
    await connection.commit();
    
    // Get the newly created user
    const [newUser] = await connection.query(`
      SELECT 
        id,
        name,
        phone,
        email,
        role,
        status,
        DATE_FORMAT(created_at, '%d %b %Y') as createdAt
      FROM users 
      WHERE id = ?
    `, [userId]);
    
    res.status(201).json({
      success: true,
      message: `User created successfully with ${role} profile`,
      data: newUser[0]
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role, status } = req.body;
    
    console.log(`✏️ Updating user ${id}:`, req.body);
    
    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if phone exists for other users
    const [phoneCheck] = await pool.query(
      'SELECT id FROM users WHERE phone = ? AND id != ?',
      [phone, id]
    );
    
    if (phoneCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another user already has this phone number'
      });
    }
    
    // Check if email exists for other users
    if (email) {
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Another user already has this email'
        });
      }
    }
    
    // Update user - with email
    await pool.query(`
      UPDATE users 
      SET name = ?, email = ?, phone = ?, role = ?, status = ?
      WHERE id = ?
    `, [name, email, phone, role, status, id]);
    
    // Get updated user
    const [updated] = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        email,
        role,
        status,
        DATE_FORMAT(created_at, '%d %b %Y') as createdAt
      FROM users 
      WHERE id = ?
    `, [id]);
    
    console.log(`✅ User ${id} updated successfully`);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting user ${id}`);
    
    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deleting the last admin
    if (existing[0].role === 'admin') {
      const [adminCount] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin"'
      );
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last admin user'
        });
      }
    }
    
    // Delete user (cascading delete will remove profile)
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    
    console.log(`✅ User ${id} deleted successfully`);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// Toggle user status
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Toggling user ${id} to ${status}`);
    
    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id, role FROM users WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deactivating the last admin
    if (existing[0].role === 'admin' && status === 'inactive') {
      const [adminCount] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "active"'
      );
      if (adminCount[0].count <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate the last active admin'
        });
      }
    }
    
    await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [status, id]
    );
    
    console.log(`✅ User ${id} status updated to ${status}`);
    
    res.status(200).json({
      success: true,
      message: `User status updated to ${status}`,
      data: { id, status }
    });
  } catch (error) {
    console.error('❌ Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
};

// Update user password
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if user exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating password:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: error.message
    });
  }
};

// Update last login timestamp
const updateLastLogin = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [id]
    );
    res.status(200).json({
      success: true,
      message: 'Last login updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating last login:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating last login',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  updatePassword,
  updateLastLogin
};