const pool = require('../config/db');

// ============================================
// GET DRIVER DASHBOARD DATA
// ============================================
exports.getDriverDashboard = async (req, res) => {
    try {
        const driverUserId = req.user.id;
        const [driverRecord] = await pool.query('SELECT id FROM drivers WHERE user_id = ?', [driverUserId]);
        if (driverRecord.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found.' });
        }
        const driverId = driverRecord[0].id;

        const [trips] = await pool.query(`
            SELECT t.id as trip_id, t.trip_number, t.date, t.status, t.total_hens
            FROM trips t WHERE t.driver_id = ? AND t.status IN ('assigned', 'in_progress')
            ORDER BY t.date DESC LIMIT 1
        `, [driverId]);

        if (trips.length === 0) {
            return res.json({ success: true, data: { hasTrip: false, trips: [], orders: [] } });
        }

        const currentTrip = trips[0];
        const [orders] = await pool.query(`
            SELECT o.id as order_id, o.order_number, o.kg_ordered as kg, o.total_amount as amount, 
                   o.balance, o.order_status, o.delivery_address as address, r.shop_name as retailer, r.phone
            FROM trip_orders tos
            JOIN orders o ON tos.order_id = o.id
            JOIN retailers r ON o.retailer_id = r.id
            WHERE tos.trip_id = ?
        `, [currentTrip.trip_id]);

        const formattedTrip = {
            id: currentTrip.trip_number,
            date: new Date(currentTrip.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            orders: orders.map(order => ({
                id: order.order_number, retailer: order.retailer, address: order.address || '', phone: order.phone || '',
                kg: parseFloat(order.kg), amount: parseFloat(order.amount), status: order.order_status,
                paymentStatus: order.balance > 0 ? 'Pending' : 'Paid', actualKg: parseFloat(order.kg), cashCollected: 0, delivered: false
            })),
            totalKg: orders.reduce((sum, o) => sum + parseFloat(o.kg), 0),
            totalOrders: orders.length, status: currentTrip.status, totalHens: parseFloat(currentTrip.total_hens) || 0
        };

        res.json({ success: true, data: { hasTrip: true, trips: [formattedTrip], orders: formattedTrip.orders } });
    } catch (error) {
        console.error('❌ Error fetching driver dashboard:', error);
        res.status(500).json({ success: false, message: 'Failed to load driver dashboard' });
    }
};

// ============================================
// UPDATE TRIP & ORDERS (Start Trip / Complete Trip)
// ============================================
exports.updateTripStatus = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const driverUserId = req.user.id;
        const { tripNumber, status, totalHens, dieselAmount, orders, dieselPhotoUrl } = req.body;

        console.log(`🛠️ Processing trip update: ${tripNumber} -> ${status}`);
        console.log(`📦 Received ${orders.length} orders from frontend.`);

        const [driver] = await connection.query('SELECT id FROM drivers WHERE user_id = ?', [driverUserId]);
        if (driver.length === 0) throw new Error('Driver not found');
        const driverId = driver[0].id;

        // 1. Update Trip status
        await connection.query(
            `UPDATE trips SET status = ?, total_hens = ?, diesel_amount = ?, diesel_photo = ? 
             WHERE trip_number = ? AND driver_id = ?`,
            [status, totalHens, dieselAmount, dieselPhotoUrl || null, tripNumber, driverId]
        );

        // 2. Update individual orders
        let totalCashCollected = 0;
        for (const order of orders) {
            // Fetch the REAL numeric ID from the DB based on the order_number string
            const [orderIdResult] = await connection.query(
                'SELECT id FROM orders WHERE order_number = ?',
                [order.id]
            );

            if (orderIdResult.length === 0) {
                console.warn(`⚠️ Skipping order ${order.id} - Not found in database!`);
                continue; 
            }

            const realOrderId = orderIdResult[0].id;
            console.log(`🔗 Mapping Order ${order.id} to Database ID: ${realOrderId}`);

            // 1. Update trip_orders with actual delivery metrics
            await connection.query(
                `UPDATE trip_orders 
                 SET actual_delivered_kg = ?, cash_collected = ?, delivered_status = 'delivered'
                 WHERE trip_id = (SELECT id FROM trips WHERE trip_number = ?) 
                 AND order_id = ?`,
                [order.actualKg || order.kg, order.cashCollected || 0, tripNumber, realOrderId]
            );
            console.log(`✅ trip_orders updated for Order ${order.id}`);

            // 2. CRITICAL: ALWAYS update the MAIN orders table to 'delivered'
            if (order.cashCollected > 0) {
                await connection.query(
                    `UPDATE orders 
                     SET paid_amount = paid_amount + ?, 
                         balance = balance - ?, 
                         order_status = 'delivered',
                         delivered_date = CURDATE()
                     WHERE id = ?`,
                    [order.cashCollected, order.cashCollected, realOrderId]
                );
                totalCashCollected += parseFloat(order.cashCollected);
                console.log(`💰 Order ${order.id}: Updated main Orders table with payment. Status: 'delivered'`);
            } else {
                await connection.query(
                    `UPDATE orders 
                     SET order_status = 'delivered',
                         delivered_date = CURDATE()
                     WHERE id = ?`,
                    [realOrderId]
                );
                console.log(`📦 Order ${order.id}: Updated main Orders table status to 'delivered' (No cash).`);
            }
        }

        // 3. Send cash to verification ANY time cash is collected
        if (totalCashCollected > 0) {
            console.log(`💰 Sending ₹${totalCashCollected} to Cash Verification.`);
            await connection.query(
                `INSERT INTO cash_verifications 
                 (driver_id, trip_number, total_cash_collected, diesel_expense, status, submitted_at) 
                 VALUES (?, ?, ?, ?, 'pending', NOW())`,
                [driverId, tripNumber, totalCashCollected, dieselAmount || 0]
            );
        }

        await connection.commit();
        console.log(`🎉 Trip ${tripNumber} completed successfully. MAIN ORDERS TABLE UPDATED.`);
        res.json({ success: true, message: `Trip ${status === 'completed' ? 'completed' : 'started'} successfully!` });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error updating trip status:', error.message);
        res.status(500).json({ success: false, message: `Update Error: ${error.message}` });
    } finally {
        connection.release();
    }
};

// ============================================
// GET ALL TRIPS FOR DRIVER ("My Trips" page)
// ============================================
exports.getDriverTrips = async (req, res) => {
    try {
        const driverUserId = req.user.id;
        const [driverRecord] = await pool.query('SELECT id FROM drivers WHERE user_id = ?', [driverUserId]);
        if (driverRecord.length === 0) return res.status(404).json({ success: false, message: 'Driver profile not found.' });
        const driverId = driverRecord[0].id;

        const [trips] = await pool.query(`
            SELECT t.id as trip_id, t.trip_number, t.date, t.status, t.total_hens, t.diesel_amount
            FROM trips t WHERE t.driver_id = ? ORDER BY t.date DESC
        `, [driverId]);

        if (trips.length === 0) return res.json({ success: true, data: [] });

        const formattedTrips = [];
        for (const trip of trips) {
            const [orders] = await pool.query(`
                SELECT o.id as order_id, o.order_number, o.kg_ordered as kg, o.total_amount as amount, 
                       o.balance, o.order_status, o.delivery_address as address, r.shop_name as retailer, 
                       r.phone, tos.actual_delivered_kg as actualKg, tos.cash_collected as cashCollected, tos.delivered_status
                FROM trip_orders tos
                JOIN orders o ON tos.order_id = o.id
                JOIN retailers r ON o.retailer_id = r.id
                WHERE tos.trip_id = ?
            `, [trip.trip_id]);

            formattedTrips.push({
                id: trip.trip_number, date: new Date(trip.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                status: trip.status === 'assigned' ? 'Assigned' : trip.status === 'in_progress' ? 'In Progress' : 'Completed',
                orders: orders.map(order => ({
                    id: order.order_number, retailer: order.retailer, address: order.address || '', phone: order.phone || '',
                    kg: parseFloat(order.kg), actualKg: parseFloat(order.actualKg || order.kg), amount: parseFloat(order.amount),
                    status: order.delivered_status === 'delivered' ? 'Delivered' : 'Pending',
                    paymentStatus: order.balance > 0 ? 'Partial' : 'Paid', cashCollected: parseFloat(order.cashCollected || 0)
                })),
                totalOrders: orders.length
            });
        }
        res.json({ success: true, data: formattedTrips });
    } catch (error) {
        console.error('❌ Error fetching driver trips:', error);
        res.status(500).json({ success: false, message: 'Failed to load trips' });
    }
};

// ============================================
// GET DRIVER CASH COLLECTIONS ✅ REWRITTEN TO SHOW RETAILER NAMES
// ============================================
exports.getDriverCollections = async (req, res) => {
    try {
        const driverUserId = req.user.id;
        
        // 1. Find the driver profile ID
        const [driverRecord] = await pool.query(
            'SELECT id FROM drivers WHERE user_id = ?',
            [driverUserId]
        );

        if (driverRecord.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }
        const driverId = driverRecord[0].id;

        // 🟢 FIX: Query each order separately to get the retailer name and cash
        const [collections] = await pool.query(`
            SELECT 
                o.id as order_id,
                o.order_number,
                r.shop_name as retailer,
                tos.cash_collected as amount,
                tos.actual_delivered_kg,
                cv.status,
                cv.submitted_at as date,
                t.trip_number
            FROM trip_orders tos
            JOIN orders o ON tos.order_id = o.id
            JOIN retailers r ON o.retailer_id = r.id
            JOIN trips t ON tos.trip_id = t.id
            LEFT JOIN cash_verifications cv ON t.trip_number = cv.trip_number
            WHERE t.driver_id = ?
            AND tos.cash_collected > 0
            ORDER BY cv.submitted_at DESC
        `, [driverId]);

        // 2. Format the data for the frontend
        const formattedCollections = collections.map(c => ({
            id: `COL-${c.order_id}`,
            orderId: c.order_number,
            retailer: c.retailer,
            amount: parseFloat(c.amount),
            method: 'Cash', 
            date: new Date(c.date).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            }),
            status: c.status === 'verified' ? 'Verified' : 'Pending Verification',
            tripId: c.trip_number
        }));

        res.json({ success: true, data: formattedCollections });

    } catch (error) {
        console.error('❌ Error fetching driver collections:', error.message);
        res.status(500).json({ success: false, message: `Database Error: ${error.message}` });
    }
};

// ============================================
// GET DRIVER TRIP HISTORY (Completed Trips) ✅ ADDED
// ============================================
exports.getDriverHistory = async (req, res) => {
    try {
        const driverUserId = req.user.id;

        // 1. Get driver profile ID
        const [driverRecord] = await pool.query(
            'SELECT id FROM drivers WHERE user_id = ?',
            [driverUserId]
        );

        if (driverRecord.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found.' });
        }
        const driverId = driverRecord[0].id;

        // 2. Fetch all COMPLETED trips with their aggregated data
        const [trips] = await pool.query(`
            SELECT 
                t.trip_number,
                t.date,
                t.total_hens,
                t.diesel_amount,
                COUNT(DISTINCT tos.order_id) as total_orders,
                COALESCE(SUM(o.kg_ordered), 0) as total_kg,
                COALESCE(SUM(o.total_amount), 0) as total_amount,
                COALESCE(SUM(tos.cash_collected), 0) as total_cash_collected
            FROM trips t
            JOIN trip_orders tos ON t.id = tos.trip_id
            JOIN orders o ON tos.order_id = o.id
            WHERE t.driver_id = ? 
            AND t.status = 'completed'
            GROUP BY t.id, t.trip_number, t.date, t.total_hens, t.diesel_amount
            ORDER BY t.date DESC
        `, [driverId]);

        res.json({ success: true, data: trips });

    } catch (error) {
        console.error('❌ Error fetching driver history:', error.message);
        res.status(500).json({ success: false, message: `Database Error: ${error.message}` });
    }
};

// ============================================
// GET DRIVER PROFILE DATA ✅ ADDED
// ============================================
exports.getDriverProfile = async (req, res) => {
    try {
        const driverUserId = req.user.id;

        // 1. Fetch driver details from users, drivers, and vehicles tables
        const [profile] = await pool.query(`
            SELECT 
                u.name,
                u.phone,
                d.status,
                d.joined_date,
                v.name as vehicle_name,
                v.number as vehicle_number,
                v.type as vehicle_type
            FROM users u
            JOIN drivers d ON u.id = d.user_id
            LEFT JOIN vehicles v ON d.vehicle_number = v.number
            WHERE u.id = ?
        `, [driverUserId]);

        if (profile.length === 0) {
            return res.status(404).json({ success: false, message: 'Driver profile not found' });
        }

        res.json({ success: true, data: profile[0] });

    } catch (error) {
        console.error('❌ Error fetching driver profile:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load driver profile' });
    }
};