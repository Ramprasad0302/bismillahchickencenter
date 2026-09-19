const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// Get all retailers (Admin only)
const getAllRetailers = async (req, res) => {
  try {
    console.log('📋 Fetching all retailers...');
    const [retailers] = await pool.query(`
      SELECT r.*, u.phone, u.status as user_status 
      FROM retailers r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `);
    
    console.log(`✅ Found ${retailers.length} retailers`);
    res.status(200).json({ 
      success: true, 
      data: retailers 
    });
  } catch (error) {
    console.error('Get retailers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

// Get retailer info for logged-in user (Dashboard)
const getRetailerInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 Fetching retailer info for user:', userId);
    
    const [retailers] = await pool.query(`
      SELECT 
        r.id,
        r.shop_name,
        r.owner_name,
        r.phone,
        r.email,
        r.address,
        r.area,
        r.city,
        r.pincode,
        r.credit_limit,
        r.outstanding,
        r.status,
        DATE_FORMAT(r.joined_date, '%d %b %Y') as joined_date,
        u.name as user_name,
        u.phone as user_phone
      FROM retailers r
      JOIN users u ON r.user_id = u.id
      WHERE r.user_id = ?
    `, [userId]);
    
    if (retailers.length === 0) {
      console.log('ℹ️ No retailer found for user:', userId);
      return res.status(404).json({
        success: false,
        message: 'Retailer profile not found. Please contact admin.'
      });
    }
    
    console.log('✅ Retailer info found:', retailers[0].shop_name);
    
    res.status(200).json({
      success: true,
      data: retailers[0]
    });
  } catch (error) {
    console.error('❌ Error fetching retailer info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching retailer info',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get retailer orders
const getRetailerOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📋 Fetching orders for user:', userId);
    
    const [orders] = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.kg_ordered,
        o.kg_delivered,
        o.rate_per_kg,
        o.subtotal,
        o.discount,
        o.delivery_charge,
        o.total_amount,
        o.paid_amount,
        o.balance,
        o.payment_status,
        o.order_status,
        o.order_date,
        o.delivered_date,
        o.created_at
      FROM orders o
      INNER JOIN retailers r ON o.retailer_id = r.id
      WHERE r.user_id = ?
      ORDER BY o.created_at DESC
    `, [userId]);
    
    console.log(`✅ Found ${orders.length} orders`);
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching retailer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
};

// Get retailer stats (for dashboard)
const getRetailerStats = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📊 Fetching stats for user:', userId);
    
    const [orderStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN order_status != 'delivered' AND order_status != 'cancelled' THEN 1 ELSE 0 END) as pending_orders,
        SUM(total_amount) as total_spent,
        SUM(balance) as total_outstanding
      FROM orders o
      INNER JOIN retailers r ON o.retailer_id = r.id
      WHERE r.user_id = ?
    `, [userId]);
    
    const [retailerInfo] = await pool.query(`
      SELECT credit_limit, outstanding
      FROM retailers
      WHERE user_id = ?
    `, [userId]);
    
    const stats = {
      totalOrders: parseInt(orderStats[0]?.total_orders) || 0,
      pendingOrders: parseInt(orderStats[0]?.pending_orders) || 0,
      totalSpent: parseFloat(orderStats[0]?.total_spent) || 0,
      outstandingBalance: parseFloat(retailerInfo[0]?.outstanding) || 0,
      creditLimit: parseFloat(retailerInfo[0]?.credit_limit) || 0
    };
    
    console.log('✅ Stats calculated:', stats);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching retailer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
};

// Create retailer (Admin only)
const createRetailer = async (req, res) => {
  try {
    const { 
      owner_name, shop_name, phone, password, email, 
      address, area, city, pincode, credit_limit, status 
    } = req.body;

    if (!owner_name || !shop_name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Owner name, shop name, phone, and password are required'
      });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE phone = ?',
        [phone]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [userResult] = await connection.query(
        `INSERT INTO users (name, phone, password, role, status) 
         VALUES (?, ?, ?, 'retailer', ?)`,
        [owner_name, phone, hashedPassword, status || 'active']
      );

      const userId = userResult.insertId;

      const [retailerResult] = await connection.query(
        `INSERT INTO retailers (
          user_id, owner_name, shop_name, phone, email, 
          address, area, city, pincode, credit_limit, status, joined_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
        [
          userId, owner_name, shop_name, phone, email || null,
          address || null, area || null, city || null, pincode || null,
          credit_limit || 0, status || 'active'
        ]
      );

      await connection.commit();

      const [newRetailer] = await connection.query(`
        SELECT r.*, u.phone, u.status as user_status 
        FROM retailers r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.id = ?
      `, [retailerResult.insertId]);

      res.status(201).json({
        success: true,
        message: 'Retailer created successfully',
        data: newRetailer[0]
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create retailer error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    });
  }
};

// ============================================
// ✅ Get retailers with order statistics (for Customers page)
// ============================================
const getRetailerCustomers = async (req, res) => {
  try {
    console.log('📋 Fetching retailer customers with statistics...');

    // Opening balance (pre-system debt, if any) is folded into
    // total_purchase (it represents real business done with them before
    // this system existed) via MAX() to avoid GROUP BY issues with the
    // one-to-one join against orders' one-to-many join.
    const [customers] = await pool.query(`
      SELECT 
        r.id,
        r.shop_name,
        r.owner_name,
        r.phone,
        r.email,
        r.address,
        r.area,
        r.city,
        r.status,
        r.outstanding,
        r.credit_limit,
        r.joined_date,
        -- ✅ Total purchase: SUM of ALL orders EXCEPT cancelled + opening balance
        COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_amount ELSE 0 END), 0)
          + COALESCE(MAX(ob.original_amount), 0) as total_purchase,
        -- Total orders count (exclude cancelled)
        COUNT(CASE WHEN o.order_status != 'cancelled' THEN 1 END) as total_orders,
        -- Pending orders count
        COALESCE(SUM(CASE WHEN o.order_status = 'pending' THEN 1 ELSE 0 END), 0) as pending_orders,
        -- Processing orders count
        COALESCE(SUM(CASE WHEN o.order_status IN ('confirmed', 'processing', 'out_for_delivery') THEN 1 ELSE 0 END), 0) as processing_orders,
        -- Delivered orders count
        COALESCE(SUM(CASE WHEN o.order_status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered_orders,
        -- Last order date
        MAX(o.order_date) as last_order_date,
        COALESCE(MAX(ob.original_amount), 0) as opening_balance_original,
        COALESCE(MAX(ob.remaining_amount), 0) as opening_balance_remaining
      FROM retailers r
      LEFT JOIN orders o ON r.id = o.retailer_id
      LEFT JOIN retailer_opening_balances ob ON r.id = ob.retailer_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);

    console.log(`✅ Found ${customers.length} customers`);

    res.status(200).json({
      success: true,
      data: customers,
      count: customers.length
    });

  } catch (error) {
    console.error('❌ Error fetching retailer customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = {
  getAllRetailers,
  getRetailerInfo,
  getRetailerOrders,
  getRetailerStats,
  createRetailer,
  getRetailerCustomers
};