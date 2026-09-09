const pool = require('../config/db');
const config = require('../config/payment');

// Anything under ₹1 left on a bill isn't real money owed at this business's
// whole-rupee pricing. Same threshold used everywhere else payment_status
// is calculated (driverController, orderController, paymentService).
const PAID_THRESHOLD = 1;

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
// VERIFY CASH PAYMENT (DEDUCTS FROM RETAILER OUTSTANDING)
//
// Fixes vs. the previous version:
//   * Never wrote a `payments` row at all — verified driver cash was
//     invisible on the admin Payments page (which reads from `payments`),
//     even though the order and retailer balances were correctly updated.
//     This is why "Cash Collected" stats never matched "Recent Collections".
//   * Never recalculated the order's payment_status, so a bill paid down to
//     zero via driver cash could still read "Pending"/"Partial" forever.
//   * Subtracted from retailers.outstanding directly instead of
//     recalculating from the bills themselves, which drifts over time
//     (same class of bug fixed elsewhere in orderController/paymentService).
//   * Never wrote a ledger credit entry, unlike every other payment path
//     in the app (admin Ledgers page, online UPI/Razorpay settlement).
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

        // 1. Mark cash verification as 'verified'
        await connection.query(
            `UPDATE cash_verifications SET status = 'verified', verified_at = NOW() WHERE id = ?`,
            [verificationId]
        );

        // 2. Lock and read the order so the new balance/payment_status are
        //    computed from its real current state, not guessed at.
        const [orderRows] = await connection.query(
            `SELECT id, retailer_id, balance, paid_amount FROM orders WHERE id = ? FOR UPDATE`,
            [orderId]
        );
        if (orderRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        const order = orderRows[0];

        const currentBalance = parseFloat(order.balance) || 0;
        const newBalance = parseFloat((currentBalance - payAmount).toFixed(2));
        const newPaidAmount = parseFloat(((parseFloat(order.paid_amount) || 0) + payAmount).toFixed(2));
        const newPaymentStatus =
            newBalance < PAID_THRESHOLD ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

        await connection.query(
            `UPDATE orders 
             SET paid_amount = ?, 
                 balance = ?,
                 payment_status = ?,
                 order_status = 'delivered',
                 delivered_date = CURDATE()
             WHERE id = ?`,
            [newPaidAmount, newBalance, newPaymentStatus, orderId]
        );

        // 3. Recalculate the retailer's outstanding from the bills
        //    themselves -- safer than subtracting from the stored figure,
        //    which drifts. Balances under the paid threshold don't count
        //    as "owed" here either.
        const [[{ outstanding }]] = await connection.query(
            `SELECT COALESCE(SUM(balance), 0) AS outstanding
               FROM orders
              WHERE retailer_id = ? AND order_status != 'cancelled' AND balance >= ?`,
            [order.retailer_id, PAID_THRESHOLD]
        );
        await connection.query('UPDATE retailers SET outstanding = ? WHERE id = ?', [
            outstanding,
            order.retailer_id,
        ]);

        // 4. Write the actual payments row -- this is what makes verified
        //    driver cash show up on the admin Payments page and in stats,
        //    same table every other payment path in the app writes to.
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

        // 5. Ledger credit -- same as every other payment path.
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
            message: 'Payment verified and outstanding balance updated!',
            data: { paymentNumber, newBalance, newPaymentStatus, outstanding: parseFloat(outstanding) },
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    } finally {
        connection.release();
    }
};