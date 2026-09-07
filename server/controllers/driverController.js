const pool = require('../config/db');

// Anything under ₹1 left on a bill isn't real money owed at this business's
// whole-rupee pricing — it's rounding dust from kg × rate math (e.g. a
// ₹0.10 remainder), and should never keep an order stuck on "Partial"
// forever. Same threshold used in orderController.recordPayment and
// paymentService.settleTransaction so every path agrees on what "paid"
// means.
const PAID_THRESHOLD = 1;

// ============================================
// UPLOAD A TRIP BILL PHOTO (diesel bill, loading receipt, etc)
// The file itself is handled by multer (see routes/driver.js) before this
// runs — req.file is already saved to disk by the time we get here.
// ============================================
exports.uploadTripPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file received' });
        }
        const url = `/uploads/trip-bills/${req.file.filename}`;
        res.json({ success: true, url });
    } catch (error) {
        console.error('❌ Error uploading trip photo:', error.message);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
};

// ============================================
// GET COMPANIES (for the driver's loading-company dropdown)
// ============================================
exports.getCompanies = async (req, res) => {
    try {
        const [companies] = await pool.query(
            'SELECT id, name FROM companies WHERE is_active = TRUE ORDER BY name ASC'
        );
        res.json({ success: true, data: companies });
    } catch (error) {
        console.error('❌ Error fetching companies:', error.message);
        res.status(500).json({ success: false, message: 'Failed to load companies' });
    }
};

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
            SELECT t.id as trip_id, t.trip_number, t.date, t.status, t.total_hens, d.name as driver_name
            FROM trips t
            JOIN drivers d ON t.driver_id = d.id
            WHERE t.driver_id = ? AND t.status IN ('assigned', 'in_progress')
            ORDER BY t.date DESC LIMIT 1
        `, [driverId]);

        if (trips.length === 0) {
            return res.json({ success: true, data: { hasTrip: false, trips: [], orders: [] } });
        }

        const currentTrip = trips[0];

        // Staff assigned to this trip (cleaners today; the role column already
        // supports 'helper' if that's ever used the same way).
        const [assignedStaff] = await pool.query(`
            SELECT s.id, s.name, st.role
            FROM staff_trips st
            JOIN staff s ON st.staff_id = s.id
            WHERE st.trip_id = ?
        `, [currentTrip.trip_id]);

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
            totalOrders: orders.length, status: currentTrip.status, totalHens: parseFloat(currentTrip.total_hens) || 0,
            driverName: currentTrip.driver_name,
            cleaners: assignedStaff.map(s => ({ id: s.id, name: s.name, role: s.role })),
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
        const {
            tripNumber, status, totalHens, dieselAmount, orders, dieselPhotoUrl,
            companyId, totalLoadedKg,
        } = req.body;

        console.log(`🛠️ Processing trip update: ${tripNumber} -> ${status}`);
        console.log(`📦 Received ${orders.length} orders from frontend.`);

        const [driver] = await connection.query('SELECT id FROM drivers WHERE user_id = ?', [driverUserId]);
        if (driver.length === 0) throw new Error('Driver not found');
        const driverId = driver[0].id;

        // 1. Update Trip status — now also stores which company the hens
        //    were loaded from and how many kg were loaded in total.
        await connection.query(
            `UPDATE trips SET status = ?, total_hens = ?, total_loaded_kg = ?, company_id = ?, diesel_amount = ?, diesel_photo = ? 
             WHERE trip_number = ? AND driver_id = ?`,
            [
                status,
                totalHens,
                parseFloat(totalLoadedKg) || 0,
                companyId || null,
                dieselAmount,
                dieselPhotoUrl || null,
                tripNumber,
                driverId,
            ]
        );

        const [tripRow] = await connection.query(
            'SELECT id, date FROM trips WHERE trip_number = ? AND driver_id = ?',
            [tripNumber, driverId]
        );
        const tripId = tripRow[0]?.id;
        const tripDate = tripRow[0]?.date
            ? new Date(tripRow[0].date).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

        // 2. Update individual orders
        let totalCashCollected = 0;
        for (const order of orders) {
            // Fetch the REAL numeric ID and the pricing fields needed to
            // recompute the bill, based on the order_number string
            const [orderRows] = await connection.query(
                `SELECT id, retailer_id, kg_ordered, rate_per_kg, discount, delivery_charge, paid_amount
                 FROM orders WHERE order_number = ?`,
                [order.id]
            );

            if (orderRows.length === 0) {
                console.warn(`Skipping order ${order.id} - Not found in database!`);
                continue; 
            }

            const dbOrder = orderRows[0];
            const realOrderId = dbOrder.id;
            console.log(`Mapping Order ${order.id} to Database ID: ${realOrderId}`);

            // The actual weight delivered can differ from what was ordered --
            // the driver may hand over 192kg against a 190kg order. Whatever
            // is entered here is the figure that has to drive both the stored
            // kg_delivered AND the bill; falls back to the ordered quantity if
            // the driver left it blank or entered 0.
            const actualKg = parseFloat(order.actualKg) > 0
                ? parseFloat(order.actualKg)
                : parseFloat(dbOrder.kg_ordered);
            const cashCollected = parseFloat(order.cashCollected) || 0;
            const hensDelivered = parseFloat(order.hensDelivered) || 0;

            const ratePerKg = parseFloat(dbOrder.rate_per_kg) || 0;
            const discount = parseFloat(dbOrder.discount) || 0;
            const deliveryCharge = parseFloat(dbOrder.delivery_charge) || 0;
            const previousPaid = parseFloat(dbOrder.paid_amount) || 0;

            // Bill is recalculated from the ACTUAL delivered weight, not the
            // ordered one -- this is what makes a 190kg order that delivers
            // 192kg bill correctly instead of silently staying at the
            // original 190kg amount.
            const newSubtotal = actualKg * ratePerKg;
            const newTotalAmount = newSubtotal + deliveryCharge - discount;
            const newPaidAmount = previousPaid + cashCollected;
            const newBalance = newTotalAmount - newPaidAmount;

            // The bill was just recalculated off the ACTUAL delivered weight,
            // which can be more or less than what was ordered and already
            // paid for. payment_status has to be re-derived here too --
            // otherwise an order paid in full at order time (e.g. 2kg via
            // UPI) still reads "Paid" after the driver delivers 20kg for a
            // much bigger bill, even though most of it is now unpaid.
            // A balance under ₹1 counts as fully paid — see PAID_THRESHOLD.
            const newPaymentStatus =
                newBalance < PAID_THRESHOLD ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

            // 1. Update trip_orders with actual delivery metrics — now
            //    including hens delivered to this specific retailer.
            await connection.query(
                `UPDATE trip_orders 
                 SET actual_delivered_kg = ?, hens_delivered = ?, cash_collected = ?, delivered_status = 'delivered'
                 WHERE trip_id = (SELECT id FROM trips WHERE trip_number = ?) 
                 AND order_id = ?`,
                [actualKg, hensDelivered, cashCollected, tripNumber, realOrderId]
            );
            console.log(`trip_orders updated for Order ${order.id}`);

            // 2. Update the MAIN orders table: kg_delivered, recalculated bill,
            //    payment, and status. This runs every time regardless of
            //    whether cash was collected, because kg_delivered and the
            //    recalculated total need to be stored even on a fully-prepaid
            //    (UPI) order where cashCollected is legitimately 0.
            await connection.query(
                `UPDATE orders 
                 SET kg_delivered = ?,
                     subtotal = ?,
                     total_amount = ?,
                     paid_amount = ?,
                     balance = ?,
                     payment_status = ?,
                     order_status = 'delivered',
                     delivered_date = CURDATE()
                 WHERE id = ?`,
                [actualKg, newSubtotal, newTotalAmount, newPaidAmount, newBalance, newPaymentStatus, realOrderId]
            );

            // Keep the retailer's running outstanding total in step with
            // this recalculated bill -- otherwise Ledgers/dashboard totals
            // drift the same way payment_status used to before this fix.
            // Balances under ₹1 don't count as "owed" here either.
            if (dbOrder.retailer_id) {
                await connection.query(
                    `UPDATE retailers
                        SET outstanding = (
                            SELECT COALESCE(SUM(balance), 0) FROM orders
                             WHERE retailer_id = ? AND order_status != 'cancelled' AND balance >= ?
                        )
                      WHERE id = ?`,
                    [dbOrder.retailer_id, PAID_THRESHOLD, dbOrder.retailer_id]
                );
            }

            if (cashCollected > 0) {
                totalCashCollected += cashCollected;
                console.log(`Order ${order.id}: delivered ${actualKg}kg / ${hensDelivered} hens, bill Rs.${newTotalAmount.toFixed(2)}, cash collected Rs.${cashCollected}, status: ${newPaymentStatus}`);
            } else {
                console.log(`Order ${order.id}: delivered ${actualKg}kg / ${hensDelivered} hens, bill Rs.${newTotalAmount.toFixed(2)} (no cash collected this trip), status: ${newPaymentStatus}`);
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

        // 4. Record trip expenses. Only on completion — hens and diesel are
        //    still being edited while the trip is in progress, and re-running
        //    this on every save would duplicate the expense rows.
        if (status === 'completed' && tripId) {
            const recordedBy = req.user.name || 'Driver';

            // --- Loading expense: hens x rate per hen ---
            // Rate is intentionally hardcoded here rather than read from a
            // settings table, matching how it was specified. If this ever
            // needs to be admin-editable, move it to the pricing/settings
            // table and read it at the top of this function instead.
            const LOADING_RATE_PER_HEN = 0.5;
            const hensCount = parseFloat(totalHens) || 0;
            if (hensCount > 0) {
                const loadingAmount = hensCount * LOADING_RATE_PER_HEN;
                await connection.query(
                    `INSERT INTO expenses (category, trip_id, description, amount, date, recorded_by)
                     VALUES ('loading', ?, ?, ?, ?, ?)`,
                    [
                        tripId,
                        `Loading charge: ${hensCount} hens × ₹${LOADING_RATE_PER_HEN}`,
                        loadingAmount,
                        tripDate,
                        recordedBy,
                    ]
                );
                console.log(`💰 Loading expense recorded: ₹${loadingAmount} for trip ${tripId}`);
            }

            // --- Food expense: per-head allowance for everyone on the trip ---
            const FOOD_RATE_PER_HEAD = 150;
            const [staffOnTrip] = await connection.query(
                'SELECT COUNT(*) as cnt FROM staff_trips WHERE trip_id = ?',
                [tripId]
            );
            // +1 for the driver, who is never in staff_trips (drivers live in
            // their own table) but still eats on the trip.
            const headCount = (staffOnTrip[0]?.cnt || 0) + 1;
            const foodAmount = headCount * FOOD_RATE_PER_HEAD;
            await connection.query(
                `INSERT INTO expenses (category, trip_id, description, amount, date, recorded_by)
                 VALUES ('food', ?, ?, ?, ?, ?)`,
                [
                    tripId,
                    `Food allowance: ${headCount} head × ₹${FOOD_RATE_PER_HEAD}`,
                    foodAmount,
                    tripDate,
                    recordedBy,
                ]
            );
            console.log(`🍛 Food expense recorded: ₹${foodAmount} for trip ${tripId} (${headCount} heads)`);

            // --- Diesel expense: whatever the driver entered, with the bill photo ---
            const dieselAmt = parseFloat(dieselAmount) || 0;
            if (dieselAmt > 0) {
                await connection.query(
                    `INSERT INTO expenses (category, trip_id, description, amount, photo_url, date, recorded_by)
                     VALUES ('diesel', ?, ?, ?, ?, ?, ?)`,
                    [
                        tripId,
                        `Diesel for trip ${tripNumber}`,
                        dieselAmt,
                        dieselPhotoUrl || null,
                        tripDate,
                        recordedBy,
                    ]
                );
                console.log(`⛽ Diesel expense recorded: ₹${dieselAmt} for trip ${tripId}`);
            }
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