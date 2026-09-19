const pool = require('../config/db');
const config = require('../config/payment');

const dateStamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

// ============================================
// GET PENDING CASH VERIFICATIONS
// ============================================
exports.getPendingVerifications = async (req, res) => {
    try {
        // Only Admin can view this
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // ✅ MARIA DB / MYSQL FIX: Use GROUP BY with MIN() to safely pick one order per verification
        const [pending] = await pool.query(`
            SELECT 
                cv.id as verification_id,
                cv.trip_number,
                cv.total_cash_collected as amount,
                cv.diesel_expense,
                cv.submitted_at,
                u.name as driver_name,
                u.phone as driver_phone,
                r.shop_name as retailer,
                r.phone as retailer_phone,
                MIN(o.order_number) as order_number,
                MIN(o.id) as order_id
            FROM cash_verifications cv
            JOIN trips t ON cv.trip_number = t.trip_number
            JOIN drivers d ON t.driver_id = d.id
            JOIN users u ON d.user_id = u.id
            JOIN trip_orders tos ON t.id = tos.trip_id
            JOIN orders o ON tos.order_id = o.id
            JOIN retailers r ON o.retailer_id = r.id
            WHERE cv.status = 'pending'
            GROUP BY cv.id
            ORDER BY cv.submitted_at DESC
        `);

        res.json({ success: true, data: pending });

    } catch (error) {
        console.error('Error fetching pending verifications:', error);
        res.status(500).json({ success: false, message: 'Failed to load data' });
    }
};

// ============================================
// GET VERIFIED CASH HISTORY
// ============================================
exports.getVerifiedHistory = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // ✅ MARIA DB / MYSQL FIX: Use GROUP BY with MIN() to safely pick one order per verification
        const [verified] = await pool.query(`
            SELECT 
                cv.id as verification_id,
                cv.trip_number,
                cv.total_cash_collected as amount,
                cv.diesel_expense,
                cv.submitted_at,
                cv.verified_at,
                u.name as driver_name,
                u.phone as driver_phone,
                r.shop_name as retailer,
                r.phone as retailer_phone,
                MIN(o.order_number) as order_number,
                MIN(o.id) as order_id
            FROM cash_verifications cv
            JOIN trips t ON cv.trip_number = t.trip_number
            JOIN drivers d ON t.driver_id = d.id
            JOIN users u ON d.user_id = u.id
            JOIN trip_orders tos ON t.id = tos.trip_id
            JOIN orders o ON tos.order_id = o.id
            JOIN retailers r ON o.retailer_id = r.id
            WHERE cv.status = 'verified'
            GROUP BY cv.id
            ORDER BY cv.verified_at DESC
        `);

        res.json({ success: true, data: verified });

    } catch (error) {
        console.error('Error fetching verified history:', error);
        res.status(500).json({ success: false, message: 'Failed to load data' });
    }
};

// ============================================
// VERIFY CASH PAYMENT (audit/confirmation only)
//
// CRITICAL FIX vs. the previous version: it was updating orders.paid_amount
// / orders.balance / retailers.outstanding a SECOND time here. Those were
// already updated once, correctly, when the driver completed the trip
// (driverController.updateTripStatus writes paid_amount/balance based on
// cashCollected the moment delivery happens, and recalculates
// retailers.outstanding right there). This "verification" step is the
// admin confirming that the cash the driver says they collected was
// physically handed over -- it is an audit action, not a second payment.
// Re-applying the amount to the order here double-counted every verified
// cash collection (₹10,000 collected → ₹20,000 recorded).
//
// What verification actually does now:
//   1. Marks the cash_verifications row 'verified'.
//   2. Writes the payments row + ledger credit for bookkeeping/audit
//      trail (this is what makes it show up on the admin Payments page --
//      the part that was genuinely missing before).
//   3. Does NOT touch orders or retailers.outstanding -- those are already
//      correct from delivery time.
// ============================================
exports.verifyPayment = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (req.user.role !== 'admin') {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { verificationId, orderId, amount, driverName, tripNumber } = req.body;
        const payAmount = parseFloat(amount);

        if (!verificationId || !orderId || !payAmount || payAmount <= 0) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Invalid verification data' });
        }

        // Guard against double-clicking / double-submitting the same
        // verification -- if it's already verified, do nothing further.
        const [cvRows] = await connection.query(
            `SELECT status FROM cash_verifications WHERE id = ? FOR UPDATE`,
            [verificationId]
        );
        if (cvRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Verification record not found' });
        }
        if (cvRows[0].status === 'verified') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'This collection has already been verified.' });
        }

        // 1. Mark cash verification as 'verified'
        await connection.query(
            `UPDATE cash_verifications SET status = 'verified', verified_at = NOW() WHERE id = ?`,
            [verificationId]
        );

        // 2. Look up the retailer this order belongs to, purely so the
        //    payments/ledger rows below are attributed correctly. Order
        //    and retailer balances themselves are NOT modified here.
        const [orderRows] = await connection.query(
            `SELECT id, retailer_id FROM orders WHERE id = ?`,
            [orderId]
        );
        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orderRows[0];

        // 3. Write the actual payments row -- this is what makes verified
        //    driver cash show up on the admin Payments page and in stats.
        //    It's a record of money that already moved (at delivery time),
        //    not new money being applied now.
        const [countRows] = await connection.query(
            'SELECT COUNT(*) AS count FROM payments WHERE DATE(created_at) = CURDATE()'
        );
        const paymentNumber = `PAY-${dateStamp()}-${String(countRows[0].count + 1).padStart(4, '0')}`;

        const [paymentResult] = await connection.query(
            `INSERT INTO payments (
               payment_number, retailer_id, order_id, amount, method, status,
               collected_by, collected_by_role, verified_by, verified_at, notes
             ) VALUES (?, ?, ?, ?, 'cash', 'verified', ?, 'driver', ?, NOW(), ?)`,
            [
                paymentNumber,
                order.retailer_id,
                orderId,
                payAmount,
                driverName || 'Driver',
                req.user.name || 'Admin',
                `Driver cash verified for trip ${tripNumber || ''}`.trim(),
            ]
        );

        // 4. Ledger credit -- same as every other payment path, purely a
        //    record of the transaction for the ledger view.
        await connection.query(
            `INSERT INTO \`${config.ledgerTable}\`
               (retailer_id, order_id, payment_id, type, amount, description, date, created_at)
             VALUES (?, ?, ?, 'credit', ?, ?, NOW(), NOW())`,
            [
                order.retailer_id,
                orderId,
                paymentResult.insertId,
                payAmount,
                'Driver-collected cash, verified by admin',
            ]
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Cash collection verified.',
            data: { paymentNumber },
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    } finally {
        connection.release();
    }
};