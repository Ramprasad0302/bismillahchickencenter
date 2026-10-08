const pool = require('../config/db');

// Get all vehicles
const getAllVehicles = async (req, res) => {
  try {
    console.log('📋 Fetching all vehicles...');
    const [rows] = await pool.query(`
      SELECT 
        id,
        name,
        number,
        type,
        capacity,
        fuel_type as fuelType,
        status,
        DATE_FORMAT(last_maintenance, '%d %b %Y') as lastMaintenance,
        today_trips as todayTrips,
        total_trips as totalTrips,
        created_at as createdAt,
        updated_at as updatedAt
      FROM vehicles 
      ORDER BY id DESC
    `);
    
    console.log(`✅ Found ${rows.length} vehicles`);
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('❌ Error fetching vehicles:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicles',
      error: error.message
    });
  }
};

// Get single vehicle by ID
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM vehicles WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    const vehicle = {
      id: rows[0].id,
      name: rows[0].name,
      number: rows[0].number,
      type: rows[0].type,
      capacity: rows[0].capacity,
      fuelType: rows[0].fuel_type,
      status: rows[0].status,
      lastMaintenance: rows[0].last_maintenance,
      todayTrips: rows[0].today_trips,
      totalTrips: rows[0].total_trips
    };
    
    res.status(200).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    console.error('❌ Error fetching vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle',
      error: error.message
    });
  }
};

// Add new vehicle
const addVehicle = async (req, res) => {
  try {
    console.log('➕ Adding new vehicle:', req.body);
    const { name, number, type, capacity, fuelType, status } = req.body;
    
    // Validate input
    if (!name || !number || !type || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Name, number, type, and capacity are required'
      });
    }
    
    // Check if vehicle number already exists
    const [existing] = await pool.query(
      'SELECT id FROM vehicles WHERE number = ?',
      [number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this number already exists'
      });
    }
    
    // Insert new vehicle
    const [result] = await pool.query(`
      INSERT INTO vehicles (name, number, type, capacity, fuel_type, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, number, type, capacity, fuelType || 'Diesel', status || 'active']);
    
    // Get the newly created vehicle
    const [newVehicle] = await pool.query(
      'SELECT * FROM vehicles WHERE id = ?',
      [result.insertId]
    );
    
    console.log(`✅ Vehicle added with ID: ${result.insertId}`);
    
    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: {
        id: newVehicle[0].id,
        name: newVehicle[0].name,
        number: newVehicle[0].number,
        type: newVehicle[0].type,
        capacity: newVehicle[0].capacity,
        fuelType: newVehicle[0].fuel_type,
        status: newVehicle[0].status,
        lastMaintenance: newVehicle[0].last_maintenance,
        todayTrips: newVehicle[0].today_trips,
        totalTrips: newVehicle[0].total_trips
      }
    });
  } catch (error) {
    console.error('❌ Error adding vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding vehicle',
      error: error.message
    });
  }
};

// Update vehicle
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, number, type, capacity, fuelType, status } = req.body;
    
    console.log(`✏️ Updating vehicle ${id}:`, req.body);
    
    // Check if vehicle exists
    const [existing] = await pool.query(
      'SELECT id FROM vehicles WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Check if number exists for other vehicles
    const [numberCheck] = await pool.query(
      'SELECT id FROM vehicles WHERE number = ? AND id != ?',
      [number, id]
    );
    
    if (numberCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another vehicle already has this number'
      });
    }
    
    // Update vehicle
    await pool.query(`
      UPDATE vehicles 
      SET name = ?, number = ?, type = ?, capacity = ?, fuel_type = ?, status = ?
      WHERE id = ?
    `, [name, number, type, capacity, fuelType, status, id]);
    
    // Get updated vehicle
    const [updated] = await pool.query(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );
    
    console.log(`✅ Vehicle ${id} updated successfully`);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: {
        id: updated[0].id,
        name: updated[0].name,
        number: updated[0].number,
        type: updated[0].type,
        capacity: updated[0].capacity,
        fuelType: updated[0].fuel_type,
        status: updated[0].status,
        lastMaintenance: updated[0].last_maintenance,
        todayTrips: updated[0].today_trips,
        totalTrips: updated[0].total_trips
      }
    });
  } catch (error) {
    console.error('❌ Error updating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle',
      error: error.message
    });
  }
};

// Delete vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting vehicle ${id}`);
    
    // Check if vehicle exists
    const [existing] = await pool.query(
      'SELECT id FROM vehicles WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    // Delete vehicle
    await pool.query('DELETE FROM vehicles WHERE id = ?', [id]);
    
    console.log(`✅ Vehicle ${id} deleted successfully`);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting vehicle',
      error: error.message
    });
  }
};

// Toggle vehicle status
const toggleVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Toggling vehicle ${id} to ${status}`);
    
    // Check if vehicle exists
    const [existing] = await pool.query(
      'SELECT id FROM vehicles WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    await pool.query(
      'UPDATE vehicles SET status = ? WHERE id = ?',
      [status, id]
    );
    
    console.log(`✅ Vehicle ${id} status updated to ${status}`);
    
    res.status(200).json({
      success: true,
      message: `Vehicle status updated to ${status}`,
      data: { id, status }
    });
  } catch (error) {
    console.error('❌ Error toggling vehicle status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle status',
      error: error.message
    });
  }
};

// Update vehicle trips count (called when trip is assigned/completed)
const updateVehicleTrips = async (req, res) => {
  try {
    const { id } = req.params;
    const { todayTrips, totalTrips } = req.body;
    
    await pool.query(`
      UPDATE vehicles 
      SET today_trips = ?, total_trips = total_trips + ?
      WHERE id = ?
    `, [todayTrips || 0, totalTrips || 1, id]);
    
    res.status(200).json({
      success: true,
      message: 'Vehicle trips updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating vehicle trips:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle trips',
      error: error.message
    });
  }
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  toggleVehicleStatus,
  updateVehicleTrips
};