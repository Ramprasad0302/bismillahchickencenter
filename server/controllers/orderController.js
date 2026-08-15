const pool = require('../config/db');

// createTables.js creates `ledger`; the old recordPayment inserted into
// `ledgers`, which does not exist — every admin payment threw and rolled back.
const LEDGER_TABLE = process.env.LEDGER_TABLE || 'ledger';

// ============================================
// CREATE ORDER
// ============================================
const createOrder = async (req, res) => {
    let connection;
    try {
        console.log('=================================');
        console.log('📝 CREATE ORDER API CALLED');
        console.log('=================================');
        
        const userId = req.user.id;
        console.log('👤 User ID from JWT:', userId);
        
        const {
            kg_ordered,
            rate_per_kg,
            delivery_charge = 0,
            discount = 0,
            payment_method = 'pending',
            delivery_address = null,
            notes = null,
            order_date = new Date()
        } = req.body;
        
        console.log('📦 Order Data Received:', {
            kg_ordered,
            rate_per_kg,
            delivery_charge,
            discount,
            payment_method,
            delivery_address,
            notes,
            order_date
        });

        // VALIDATION
        if (!kg_ordered || kg_ordered <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid quantity (kg_ordered > 0)'
            });
        }

        if (!rate_per_kg || rate_per_kg <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid rate per kg'
            });
        }

        // GET RETAILER ID
        console.log('🔍 Looking up retailer for user:', userId);
        const [retailer] = await pool.query(
            'SELECT id FROM retailers WHERE user_id = ?',
            [userId]
        );

        if (retailer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retailer profile not found. Please contact admin.'
            });
        }

        const retailerId = retailer[0].id;
        console.log('✅ Retailer ID found:', retailerId);

        // CALCULATE FINANCIALS
        const subtotal = parseFloat(kg_ordered) * parseFloat(rate_per_kg);
        const total_amount = subtotal + parseFloat(delivery_charge) - parseFloat(discount);
        const paid_amount = 0;
        const balance = total_amount;
        
        console.log('💰 Financials Calculated:', {
            subtotal,
            total_amount,
            paid_amount,
            balance
        });

        // GENERATE ORDER NUMBER
        // COUNT(*) + 1 collided whenever two orders were placed in the same
        // second: both got the same number and the UNIQUE constraint made the
        // second insert fail. Reading the highest number already issued today
        // and retrying on a duplicate handles the race.
        const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
        const nextOrderNumber = async () => {
            const [rows] = await pool.query(
                `SELECT order_number FROM orders
                  WHERE order_number LIKE ?
                  ORDER BY order_number DESC LIMIT 1`,
                [`BIS-${dateStr}-%`]
            );
            const lastSeq = rows.length
                ? parseInt(rows[0].order_number.split('-').pop(), 10) || 0
                : 0;
            return `BIS-${dateStr}-${String(lastSeq + 1).padStart(4, '0')}`;
        };

        // GET CONNECTION FOR TRANSACTION
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // INSERT ORDER (retry on duplicate order_number)
        console.log('💾 Inserting order into database...');

        let result;
        let order_number;
        const MAX_ATTEMPTS = 5;

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            order_number = await nextOrderNumber();
            try {
                [result] = await connection.query(
                    `INSERT INTO orders (
                        order_number,
                        retailer_id,
                        kg_ordered,
                        rate_per_kg,
                        subtotal,
                        discount,
                        delivery_charge,
                        total_amount,
                        paid_amount,
                        balance,
                        payment_method,
                        payment_status,
                        order_status,
                        delivery_address,
                        notes,
                        order_date,
                        created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        order_number,
                        retailerId,
                        kg_ordered,
                        rate_per_kg,
                        subtotal,
                        discount,
                        delivery_charge,
                        total_amount,
                        paid_amount,
                        balance,
                        payment_method,
                        'pending',
                        'pending',
                        delivery_address,
                        notes,
                        order_date
                    ]
                );
                break;
            } catch (insertError) {
                if (insertError.code === 'ER_DUP_ENTRY' && attempt < MAX_ATTEMPTS) {
                    console.warn(`⚠️  ${order_number} was taken, retrying (${attempt}/${MAX_ATTEMPTS})`);
                    continue;
                }
                throw insertError;
            }
        }

        console.log('📋 Order Number:', order_number);
        console.log('✅ Order inserted with ID:', result.insertId);

        // Keep the retailer's running outstanding in step with the new bill.
        await connection.query(
            `UPDATE retailers
                SET outstanding = (
                    SELECT COALESCE(SUM(balance), 0) FROM orders
                     WHERE retailer_id = ? AND order_status != 'cancelled'
                )
              WHERE id = ?`,
            [retailerId, retailerId]
        );

        await connection.commit();

        // GET THE CREATED ORDER
        const [newOrder] = await pool.query(`
            SELECT 
                o.*,
                r.shop_name,
                r.owner_name,
                r.phone as retailer_phone
            FROM orders o
            JOIN retailers r ON o.retailer_id = r.id
            WHERE o.id = ?
        `, [result.insertId]);

        console.log('✅ Order created successfully:', order_number);
        console.log('=================================');

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: newOrder[0]
        });

    } catch (error) {
        console.error('❌ ERROR in createOrder:', error);
        console.error('❌ Error Message:', error.message);
        console.log('=================================');
        
        if (connection) {
            try {
                await connection.rollback();
                console.log('🔄 Transaction rolled back');
            } catch (rollbackError) {
                console.error('❌ Rollback failed:', rollbackError);
            }
        }
        
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    } finally {
        if (connection) {
            try {
                connection.release();
                console.log('🔌 Connection released');
            } catch (releaseError) {
                console.error('❌ Release failed:', releaseError);
            }
        }
    }
};

// ============================================
// GET MY ORDERS (Retailer) ✅ READS FROM trip_orders
// ============================================
const getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('📋 Fetching orders for user:', userId);

        const [retailer] = await pool.query(
            'SELECT id FROM retailers WHERE user_id = ?',
            [userId]
        );

        if (retailer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retailer profile not found'
            });
        }

        // ✅ COMPLETE QUERY: Pull delivered_status directly from trip_orders
        const [orders] = await pool.query(`
            SELECT 
                o.id,
                o.order_number,
                o.kg_ordered,
                o.rate_per_kg,
                o.total_amount,
                o.paid_amount,
                o.balance,
                o.payment_method,
                o.payment_status,
                o.order_status as original_order_status, -- Keep original for fallback
                o.delivery_address,
                o.order_date,
                o.created_at,
                o.delivered_date,
                r.shop_name,
                r.owner_name,
                r.phone as retailer_phone,
                -- Pull actual delivered stats
                COALESCE(to_.actual_delivered_kg, 
                    CASE WHEN o.order_status = 'delivered' THEN o.kg_ordered ELSE 0 END
                ) as kg_delivered,
                COALESCE(to_.cash_collected, 0) as cash_collected,
                t.trip_number,
                -- 🟢 CRITICAL CHANGE: Read this for the Green Badge!
                to_.delivered_status
            FROM orders o
            JOIN retailers r ON o.retailer_id = r.id
            LEFT JOIN trip_orders to_ ON o.id = to_.order_id
            LEFT JOIN trips t ON o.trip_id = t.id
            WHERE o.retailer_id = ?
            ORDER BY o.created_at DESC
        `, [retailer[0].id]);

        // Map data to frontend expectations (Prioritize trip_orders delivered_status)
        const formattedOrders = orders.map(order => ({
            ...order,
            // If trip_orders says delivered, override main orders status!
            order_status: order.delivered_status === 'delivered' 
                ? 'delivered' 
                : order.original_order_status
        }));

        console.log(`✅ Found ${formattedOrders.length} orders mapped from trip_orders`);

        res.status(200).json({
            success: true,
            data: formattedOrders,
            count: formattedOrders.length
        });

    } catch (error) {
        console.error('❌ Error in getMyOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// ============================================
// GET ALL ORDERS (Admin) ✅ READS FROM trip_orders
// ============================================
const getAllOrders = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        console.log('📋 Fetching orders...');

        const { retailer_id } = req.query;

        let sqlQuery = `
            SELECT 
                o.id,
                o.order_number,
                o.kg_ordered,
                o.rate_per_kg,
                o.total_amount,
                o.paid_amount,
                o.balance,
                o.payment_method,
                o.payment_status,
                o.order_status as original_order_status,
                o.delivery_address,
                o.order_date,
                o.created_at,
                r.shop_name,
                r.owner_name,
                r.phone as retailer_phone,
                COALESCE(to_.actual_delivered_kg, 
                    CASE WHEN o.order_status = 'delivered' THEN o.kg_ordered ELSE 0 END
                ) as kg_delivered,
                COALESCE(to_.cash_collected, 0) as cash_collected,
                t.trip_number,
                to_.delivered_status
            FROM orders o
            JOIN retailers r ON o.retailer_id = r.id
            LEFT JOIN trip_orders to_ ON o.id = to_.order_id
            LEFT JOIN trips t ON o.trip_id = t.id
        `;
        
        let queryParams = [];

        if (retailer_id) {
            sqlQuery += ` WHERE o.retailer_id = ?`;
            queryParams.push(retailer_id);
        }

        sqlQuery += ` ORDER BY o.created_at DESC`;

        const [orders] = await pool.query(sqlQuery, queryParams);

        const formattedOrders = orders.map(order => ({
            ...order,
            order_status: order.delivered_status === 'delivered' 
                ? 'delivered' 
                : order.original_order_status
        }));

        console.log(`✅ Found ${formattedOrders.length} orders mapped from trip_orders`);

        res.status(200).json({
            success: true,
            data: formattedOrders,
            count: formattedOrders.length
        });

    } catch (error) {
        console.error('❌ Error in getAllOrders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
};

// ============================================
// GET ORDER BY ID (Single order details) ✅ FINAL FIX
// ============================================
const getOrderById = async (req, res) => {
    try {
        // ✅ Frontend now passes the numeric Primary Key ID
        const { id } = req.params; 
        const userId = req.user.id;
        const userRole = req.user.role;

        // ✅ CRITICAL FIX: Include o.retailer_id in the SELECT clause!
        const [orders] = await pool.query(`
            SELECT 
                o.id,
                o.order_number,
                o.retailer_id,  -- 🟢 THIS WAS MISSING! Without this, undefined happens.
                o.kg_ordered,
                o.rate_per_kg,
                o.total_amount,
                o.paid_amount,
                o.balance,
                o.payment_method,
                o.payment_status,
                o.order_status as original_order_status,
                o.delivery_address,
                o.order_date,
                o.created_at,
                o.delivered_date,
                r.shop_name,
                r.owner_name,
                r.phone as retailer_phone,
                COALESCE(to_.actual_delivered_kg, 
                    CASE WHEN o.order_status = 'delivered' THEN o.kg_ordered ELSE 0 END
                ) as kg_delivered,
                COALESCE(to_.cash_collected, 0) as cash_collected,
                t.trip_number,
                to_.delivered_status
            FROM orders o
            JOIN retailers r ON o.retailer_id = r.id
            LEFT JOIN trip_orders to_ ON o.id = to_.order_id
            LEFT JOIN trips t ON o.trip_id = t.id
            WHERE o.id = ? 
        `, [id]); // ✅ Searching by Numeric Primary ID

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        const order = orders[0];
        
        // Override status based on trip_orders
        order.order_status = order.delivered_status === 'delivered' 
            ? 'delivered' 
            : order.original_order_status;

        // 🔒 Security Check: Make sure the logged-in user owns this order
        if (userRole !== 'admin') {
            // Find the retailer profile of the logged-in user
            const [retailer] = await pool.query(
                'SELECT id FROM retailers WHERE user_id = ?',
                [userId]
            );

            // 🛡️ FINAL FIX: Compare using Number() 
            if (retailer.length === 0 || Number(order.retailer_id) !== Number(retailer[0].id)) {
                console.warn(`🚫 Access Denied! Order ID ${id} belongs to retailer ${order.retailer_id}, but user is linked to retailer ${retailer[0]?.id}`);
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. This is not your order.'
                });
            }
        }

        res.status(200).json({
            success: true,
            data: order
        });

    } catch (error) {
        console.error('❌ Error in getOrderById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order'
        });
    }
};

// ============================================
// UPDATE ORDER STATUS (Admin)
// ============================================
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        console.log(`🔄 Updating order ${id} status to ${status}`);

        const [orderExists] = await pool.query(
            'SELECT * FROM orders WHERE id = ?',
            [id]
        );

        if (orderExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        await pool.query(
            `UPDATE orders 
             SET order_status = ?, 
                 updated_at = NOW()
             WHERE id = ?`,
            [status, id]
        );

        const [updatedOrder] = await pool.query(
            'SELECT * FROM orders WHERE id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            data: updatedOrder[0]
        });

    } catch (error) {
        console.error('❌ Error in updateOrderStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update order status'
        });
    }
};

// ============================================
// GET ORDER STATS FOR RETAILER
// ============================================
const getOrderStats = async (req, res) => {
    try {
        const userId = req.user.id;

        const [retailer] = await pool.query(
            'SELECT id FROM retailers WHERE user_id = ?',
            [userId]
        );

        if (retailer.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Retailer profile not found'
            });
        }

        const [stats] = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN order_status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                SUM(CASE WHEN order_status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_orders,
                SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END) as processing_orders,
                SUM(CASE WHEN order_status = 'out_for_delivery' THEN 1 ELSE 0 END) as out_for_delivery_orders,
                SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
                SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                SUM(total_amount) as total_amount,
                SUM(paid_amount) as total_paid,
                SUM(balance) as total_balance,
                AVG(kg_ordered) as avg_kg_ordered,
                SUM(kg_ordered) as total_kg_ordered
            FROM orders
            WHERE retailer_id = ?
        `, [retailer[0].id]);

        res.status(200).json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('❌ Error in getOrderStats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch order statistics'
        });
    }
};

// ============================================
// NEW: RECORD A PAYMENT (Admin only)
// ============================================
const recordPayment = async (req, res) => {
    // Fixes vs. the previous version:
    //   * wrote to `ledgers`; the table createTables.js makes is `ledger`
    //   * called connection.rollback()/release() even when getConnection() failed
    //   * never updated orders.payment_status, so paid bills still read "pending"
    //   * decremented retailers.outstanding instead of recalculating it, so the
    //     figure drifted permanently after any double-post or edited order
    let connection;
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin only.'
            });
        }

        const {
            retailer_id,
            amount,
            payment_method,
            bill_allocations
        } = req.body;

        const paymentAmount = parseFloat(amount);

        if (!retailer_id || !paymentAmount || paymentAmount <= 0 ||
            !Array.isArray(bill_allocations) || bill_allocations.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment data.'
            });
        }

        const allowedMethods = ['cash', 'upi', 'bank_transfer', 'cheque'];
        const method = allowedMethods.includes(payment_method) ? payment_method : 'cash';

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [retailerRows] = await connection.query(
            'SELECT id FROM retailers WHERE id = ? FOR UPDATE',
            [retailer_id]
        );
        if (retailerRows.length === 0) {
            const err = new Error('Retailer not found');
            err.status = 404;
            throw err;
        }

        // ---- Apply against the named bills ----
        let processedAmount = 0;
        let lastUpdatedOrderId = null;
        const applied = [];

        for (const alloc of bill_allocations) {
            const allocAmount = parseFloat(alloc.amount_paid);
            if (!alloc.bill_id || !allocAmount || allocAmount <= 0) continue;

            const [orderRows] = await connection.query(
                `SELECT id, balance, paid_amount FROM orders
                  WHERE order_number = ? AND retailer_id = ? FOR UPDATE`,
                [alloc.bill_id, retailer_id]
            );
            if (orderRows.length === 0) continue;

            const order = orderRows[0];
            const currentBalance = parseFloat(order.balance) || 0;
            const payAmount = parseFloat(Math.min(allocAmount, currentBalance).toFixed(2));
            if (payAmount <= 0) continue;

            const newBalance = parseFloat((currentBalance - payAmount).toFixed(2));
            const newPaid = parseFloat(((parseFloat(order.paid_amount) || 0) + payAmount).toFixed(2));
            const paymentStatus = newBalance <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'pending';

            await connection.query(
                `UPDATE orders
                    SET balance = ?, paid_amount = ?, payment_status = ?
                  WHERE id = ?`,
                [newBalance, newPaid, paymentStatus, order.id]
            );

            lastUpdatedOrderId = order.id;
            processedAmount = parseFloat((processedAmount + payAmount).toFixed(2));
            applied.push({ order_id: order.id, order_number: alloc.bill_id, amount: payAmount });
        }

        if (processedAmount <= 0) {
            const err = new Error('None of those bills had an outstanding balance.');
            err.status = 400;
            throw err;
        }

        // ---- Record the payment ----
        const [countRows] = await connection.query(
            'SELECT COUNT(*) AS count FROM payments WHERE DATE(created_at) = CURDATE()'
        );
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const paymentNumber = `PAY-${dateStr}-${String(countRows[0].count + 1).padStart(4, '0')}`;

        const [paymentResult] = await connection.query(
            `INSERT INTO payments (
               payment_number, retailer_id, order_id, amount, method, status,
               collected_by, collected_by_role, verified_by, verified_at
             ) VALUES (?, ?, ?, ?, ?, 'verified', ?, 'admin', ?, NOW())`,
            [
                paymentNumber,
                retailer_id,
                applied.length === 1 ? applied[0].order_id : null,
                processedAmount,
                method,
                req.user.name || 'Admin',
                req.user.name || 'Admin'
            ]
        );

        // ---- Recalculate outstanding from the bills themselves ----
        const [[{ outstanding }]] = await connection.query(
            `SELECT COALESCE(SUM(balance), 0) AS outstanding
               FROM orders
              WHERE retailer_id = ? AND order_status != 'cancelled'`,
            [retailer_id]
        );

        await connection.query(
            'UPDATE retailers SET outstanding = ? WHERE id = ?',
            [outstanding, retailer_id]
        );

        // ---- Ledger credit ----
        await connection.query(
            `INSERT INTO \`${LEDGER_TABLE}\`
               (retailer_id, order_id, payment_id, type, amount, description, date, created_at)
             VALUES (?, ?, ?, 'credit', ?, ?, NOW(), NOW())`,
            [
                retailer_id,
                lastUpdatedOrderId,
                paymentResult.insertId,
                processedAmount,
                `Payment via ${method}`
            ]
        );

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                payment_number: paymentNumber,
                newOutstanding: parseFloat(outstanding),
                processedAmount,
                applied
            }
        });

    } catch (error) {
        // Guarded: if pool.getConnection() itself failed, `connection` is
        // undefined and the old code masked the real error with a TypeError.
        if (connection) {
            try { await connection.rollback(); } catch (e) { /* already closed */ }
        }
        console.error('\u274c Error in recordPayment:', error);
        res.status(error.status || 500).json({
            success: false,
            message: error.message || 'Failed to record payment'
        });
    } finally {
        if (connection) connection.release();
    }
};

// ============================================
// EXPORT ALL CONTROLLERS
// ============================================
module.exports = {
    createOrder,
    getMyOrders,
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    getOrderStats,
    recordPayment
};