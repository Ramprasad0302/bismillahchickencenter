const pool = require('../config/db');

// ============================================
// GET PENDING ORDERS (Unassigned)
// ============================================
const getPendingOrders = async (req, res) => {
  try {
    console.log('📋 Fetching pending orders...');
    
    const [orders] = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.kg_ordered,
        o.total_amount,
        o.delivery_address,
        o.order_status,
        o.created_at,
        r.shop_name,
        r.owner_name,
        r.phone as retailer_phone,
        r.address as retailer_address
      FROM orders o
      JOIN retailers r ON o.retailer_id = r.id
      WHERE o.order_status IN ('pending', 'confirmed', 'processing')
      AND o.trip_id IS NULL
      ORDER BY o.created_at ASC
    `);

    console.log(`✅ Found ${orders.length} pending orders`);
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ Error fetching pending orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending orders',
      error: error.message
    });
  }
};

// ============================================
// GET IN-PROGRESS ORDERS (Assigned to trips)
// ============================================
const getInProgressOrders = async (req, res) => {
  try {
    console.log('📋 Fetching in-progress orders...');
    
    const [orders] = await pool.query(`
      SELECT 
        o.id,
        o.order_number,
        o.kg_ordered,
        o.total_amount,
        o.delivery_address,
        o.order_status,
        o.created_at,
        o.trip_id,
        r.shop_name,
        r.owner_name,
        r.phone as retailer_phone,
        r.address as retailer_address,
        t.trip_number,
        t.status as trip_status,
        d.name as driver_name,
        d.vehicle_number,
        v.name as vehicle_name,
        v.number as vehicle_reg,
        -- 🟢 PULL REAL-TIME DELIVERY METRICS FROM trip_orders
        COALESCE(to_.actual_delivered_kg, 0) as actual_delivered_kg,
        COALESCE(to_.cash_collected, 0) as cash_collected,
        to_.delivered_status
      FROM orders o
      JOIN retailers r ON o.retailer_id = r.id
      LEFT JOIN trips t ON o.trip_id = t.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN vehicles v ON d.vehicle_number = v.number  -- ✅ FIXED: Matches d.vehicle_number
      LEFT JOIN trip_orders to_ ON o.id = to_.order_id
      WHERE o.order_status = 'out_for_delivery'
      AND o.trip_id IS NOT NULL
      ORDER BY o.created_at DESC
    `);

    console.log(`✅ Found ${orders.length} in-progress orders with trip details`);
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('❌ Error fetching in-progress orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching in-progress orders',
      error: error.message
    });
  }
};

// ============================================
// GET AVAILABLE DRIVERS (FROM USERS TABLE)
// ============================================
const getAvailableDrivers = async (req, res) => {
  try {
    console.log('📋 Fetching available drivers from users table...');
    
    // Get all users with role 'driver' and status 'active'
    const [drivers] = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        email,
        role,
        status,
        last_login
      FROM users
      WHERE role = 'driver'
      AND status = 'active'
      ORDER BY name ASC
    `);

    console.log(`✅ Found ${drivers.length} drivers in users table`);
    
    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('❌ Error fetching drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers',
      error: error.message
    });
  }
};

// ============================================
// GET VEHICLES
// ============================================
const getVehicles = async (req, res) => {
  try {
    console.log('📋 Fetching vehicles...');
    
    const [vehicles] = await pool.query(`
      SELECT 
        id,
        name,
        number,
        type,
        capacity,
        fuel_type,
        status
      FROM vehicles
      WHERE status = 'Active'
      ORDER BY name ASC
    `);

    console.log(`✅ Found ${vehicles.length} vehicles`);
    
    res.status(200).json({
      success: true,
      data: vehicles
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

// ============================================
// GET ALL STAFF (for Cleaners dropdown)
// ============================================
const getCleaners = async (req, res) => {
  try {
    console.log('📋 Fetching all staff for cleaners dropdown...');
    
    // Get ALL staff members with status 'active'
    const [cleaners] = await pool.query(`
      SELECT 
        id,
        name,
        phone,
        role,
        daily_salary,
        status,
        DATE_FORMAT(join_date, '%d %b %Y') as join_date
      FROM staff
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    console.log(`✅ Found ${cleaners.length} staff members`);
    console.log('📋 Staff data:', cleaners);
    
    res.status(200).json({
      success: true,
      data: cleaners
    });
  } catch (error) {
    console.error('❌ Error fetching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching staff',
      error: error.message
    });
  }
};

// ============================================
// ASSIGN TRIP (Create Trip & Assign Orders)
// ============================================
const assignTrip = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const {
      orderIds,
      driverId,  // This is the user_id from users table
      vehicleId,
      cleanerIds = [],  // These are staff IDs from staff table
      tripDate = new Date()
    } = req.body;

    console.log('📦 Assign Trip Data:', {
      orderIds,
      driverId,
      vehicleId,
      cleanerIds,
      tripDate
    });

    // Validate input
    if (!orderIds || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one order'
      });
    }

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a driver'
      });
    }

    if (!vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a vehicle'
      });
    }

    await connection.beginTransaction();

    // Get driver info from users table
    const [driver] = await connection.query(
      'SELECT id, name, phone FROM users WHERE id = ? AND role = "driver"',
      [driverId]
    );

    if (driver.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Driver not found in users table'
      });
    }

    // Get vehicle info
    const [vehicle] = await connection.query(
      'SELECT id, number FROM vehicles WHERE id = ?',
      [vehicleId]
    );

    if (vehicle.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if driver exists in drivers table, if not create one
    const [existingDriver] = await connection.query(
      'SELECT id FROM drivers WHERE user_id = ?',
      [driverId]
    );

    let driverProfileId;
    if (existingDriver.length === 0) {
      // Create driver profile
      const [newDriver] = await connection.query(`
        INSERT INTO drivers (
          user_id,
          name,
          phone,
          status,
          joined_date
        ) VALUES (?, ?, ?, 'available', CURDATE())
      `, [driverId, driver[0].name, driver[0].phone]);
      
      driverProfileId = newDriver.insertId;
      console.log('✅ New driver profile created with ID:', driverProfileId);
    } else {
      driverProfileId = existingDriver[0].id;
    }

    // Generate trip number
    const [countResult] = await connection.query(
      'SELECT COUNT(*) as count FROM trips WHERE DATE(created_at) = CURDATE()'
    );
    const tripCount = countResult[0].count + 1;
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    const tripNumber = `TRIP-${dateStr}-${String(tripCount).padStart(4, '0')}`;
    console.log('📋 Trip Number Generated:', tripNumber);

    // Calculate total kg from orders
    const [orderData] = await connection.query(
      `SELECT SUM(kg_ordered) as total_kg, COUNT(*) as total_orders 
       FROM orders WHERE id IN (?)`,
      [orderIds]
    );

    const totalKg = orderData[0]?.total_kg || 0;
    const totalOrders = orderData[0]?.total_orders || 0;

    // Create trip
    const [tripResult] = await connection.query(`
      INSERT INTO trips (
        trip_number,
        driver_id,
        total_hens,
        total_kg,
        status,
        date
      ) VALUES (?, ?, ?, ?, 'assigned', ?)
    `, [tripNumber, driverProfileId, 0, totalKg, tripDate]);

    const tripId = tripResult.insertId;
    console.log('✅ Trip created with ID:', tripId);

    // Assign orders to trip
    for (const orderId of orderIds) {
      await connection.query(`
        UPDATE orders 
        SET trip_id = ?, 
            order_status = 'out_for_delivery',
            updated_at = NOW()
        WHERE id = ?
      `, [tripId, orderId]);

      // Create trip_order record
      await connection.query(`
        INSERT INTO trip_orders (
          trip_id,
          order_id,
          actual_delivered_kg,
          cash_collected,
          delivered_status
        ) VALUES (?, ?, 0, 0, 'pending')
      `, [tripId, orderId]);
    }

    // Assign cleaners to trip (using staff IDs)
    if (cleanerIds && cleanerIds.length > 0) {
      for (const cleanerId of cleanerIds) {
        await connection.query(`
          INSERT INTO staff_trips (
            staff_id,
            trip_id,
            role,
            date
          ) VALUES (?, ?, 'cleaner', ?)
        `, [cleanerId, tripId, tripDate]);
      }
    }

    // Update driver status in drivers table
    await connection.query(
      'UPDATE drivers SET status = "on_delivery" WHERE user_id = ?',
      [driverId]
    );

    // Update vehicle trips count
    await connection.query(`
      UPDATE vehicles 
      SET today_trips = today_trips + 1,
          total_trips = total_trips + 1
      WHERE id = ?
    `, [vehicleId]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Trip assigned successfully',
      data: {
        trip_id: tripId,
        trip_number: tripNumber,
        orders_assigned: orderIds.length,
        total_kg: totalKg,
        driver: driver[0]
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error assigning trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning trip',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getPendingOrders,
  getInProgressOrders,
  getAvailableDrivers,
  getVehicles,
  getCleaners,
  assignTrip
};