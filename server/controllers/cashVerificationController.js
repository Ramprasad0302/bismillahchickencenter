const pool = require('../config/db');

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
// ============================================
exports.verifyPayment = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { verificationId, orderId, amount } = req.body;

        // 1. Mark cash verification as 'verified'
        await connection.query(
            `UPDATE cash_verifications SET status = 'verified', verified_at = NOW() WHERE id = ?`,
            [verificationId]
        );

        // 2. Update the specific Order: Add to paid_amount, subtract from balance, mark as delivered
        await connection.query(
            `UPDATE orders 
             SET paid_amount = paid_amount + ?, 
                 balance = balance - ?,
                 order_status = 'delivered',
                 delivered_date = CURDATE()
             WHERE id = ?`,
            [amount, amount, orderId]
        );

        // 3. 🔥 NEW FIX: Deduct exactly 'amount' from the retailer's outstanding balance
        await connection.query(`
            UPDATE retailers 
            SET outstanding = outstanding - ?
            WHERE id = (
                SELECT retailer_id FROM orders WHERE id = ?
            )
        `, [amount, orderId]);

        await connection.commit();

        res.json({ success: true, message: 'Payment verified and outstanding balance updated!' });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    } finally {
        connection.release();
    }
};