const pool = require('../config/db');

// Get all staff
const getAllStaff = async (req, res) => {
  try {
    console.log('📋 Fetching all staff...');
    const [rows] = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        role,
        daily_salary as dailySalary,
        status,
        DATE_FORMAT(join_date, '%d %b %Y') as joinDate
      FROM staff 
      ORDER BY id DESC
    `);
    
    console.log(`✅ Found ${rows.length} staff members`);
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('❌ Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff members',
      error: error.message
    });
  }
};

// Add new staff
const addStaff = async (req, res) => {
  try {
    console.log('➕ Adding new staff:', req.body);
    const { name, phone, role, dailySalary, status } = req.body;
    
    // Validate input
    if (!name || !phone || !role || !dailySalary) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, role, and daily salary are required'
      });
    }
    
    // Check if phone already exists
    const [existing] = await pool.query(
      'SELECT id FROM staff WHERE phone = ?',
      [phone]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff member with this phone number already exists'
      });
    }
    
    // Insert new staff
    const [result] = await pool.query(`
      INSERT INTO staff (name, phone, role, daily_salary, status, join_date)
      VALUES (?, ?, ?, ?, ?, CURDATE())
    `, [name, phone, role, dailySalary, status || 'active']);
    
    // Get the newly created staff
    const [newStaff] = await pool.query(
      'SELECT * FROM staff WHERE id = ?',
      [result.insertId]
    );
    
    console.log(`✅ Staff added with ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      data: {
        id: newStaff[0].id,
        name: newStaff[0].name,
        phone: newStaff[0].phone,
        role: newStaff[0].role,
        dailySalary: newStaff[0].daily_salary,
        status: newStaff[0].status,
        joinDate: newStaff[0].join_date
      }
    });
  } catch (error) {
    console.error('❌ Error adding staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding staff member',
      error: error.message
    });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, dailySalary, status } = req.body;
    
    console.log(`✏️ Updating staff ${id}:`, req.body);
    
    // Check if staff exists
    const [existing] = await pool.query(
      'SELECT id FROM staff WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    // Check if phone exists for other staff
    const [phoneCheck] = await pool.query(
      'SELECT id FROM staff WHERE phone = ? AND id != ?',
      [phone, id]
    );
    
    if (phoneCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another staff member already has this phone number'
      });
    }
    
    // Update staff
    await pool.query(`
      UPDATE staff 
      SET name = ?, phone = ?, role = ?, daily_salary = ?, status = ?
      WHERE id = ?
    `, [name, phone, role, dailySalary, status, id]);
    
    // Get updated staff
    const [updated] = await pool.query(
      'SELECT * FROM staff WHERE id = ?',
      [id]
    );
    
    console.log(`✅ Staff ${id} updated successfully`);
    
    res.status(200).json({
      success: true,
      message: 'Staff member updated successfully',
      data: {
        id: updated[0].id,
        name: updated[0].name,
        phone: updated[0].phone,
        role: updated[0].role,
        dailySalary: updated[0].daily_salary,
        status: updated[0].status,
        joinDate: updated[0].join_date
      }
    });
  } catch (error) {
    console.error('❌ Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating staff member',
      error: error.message
    });
  }
};

// Delete staff
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting staff ${id}`);
    
    // Check if staff exists
    const [existing] = await pool.query(
      'SELECT id FROM staff WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    // Delete staff
    await pool.query('DELETE FROM staff WHERE id = ?', [id]);
    
    console.log(`✅ Staff ${id} deleted successfully`);
    
    res.status(200).json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting staff member',
      error: error.message
    });
  }
};

// Toggle staff status
const toggleStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Toggling staff ${id} to ${status}`);
    
    // Check if staff exists
    const [existing] = await pool.query(
      'SELECT id FROM staff WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }
    
    await pool.query(
      'UPDATE staff SET status = ? WHERE id = ?',
      [status, id]
    );
    
    console.log(`✅ Staff ${id} status updated to ${status}`);
    
    res.status(200).json({
      success: true,
      message: `Staff status updated to ${status}`,
      data: { id, status }
    });
  } catch (error) {
    console.error('❌ Error toggling staff status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating staff status',
      error: error.message
    });
  }
};

module.exports = {
  getAllStaff,
  addStaff,
  updateStaff,
  deleteStaff,
  toggleStaffStatus
};