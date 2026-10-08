const express = require('express');
const router = express.Router();

// --- IMPORT YOUR DATABASE CONNECTION ---
// If your database file is named db.js and is in a 'config' folder, uncomment the line below:
// const db = require('../config/db'); 

// *** IMPORTANT: Replace the line above with your ACTUAL database import path ***
// If you don't know it, look at your server.js file to see how you import your DB.
// Example: const db = require('./db'); 
// For now, I will assume it is in a config folder. You MUST fix this path below.

const db = require('../config/db'); 

// ---------------------------------------------------------
// GET: Fetch all retailers with their ledger summary
// ---------------------------------------------------------
router.get('/retailers/customers', async (req, res) => {
    try {
        // Update this SQL query to match your exact retailers table column names
        const [retailers] = await db.query(`
            SELECT 
                id, 
                shop_name, 
                owner_name, 
                phone, 
                credit_limit, 
                total_purchase, 
                outstanding
            FROM retailers 
            ORDER BY shop_name ASC
        `);

        res.json({
            success: true,
            data: retailers
        });
    } catch (error) {
        console.error('Error fetching retailers:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ---------------------------------------------------------
// GET: Fetch all orders (transactions) for a specific retailer
// ---------------------------------------------------------
router.get('/orders', async (req, res) => {
    try {
        const { retailer_id } = req.query;
        
        if (!retailer_id) {
            return res.status(400).json({ success: false, message: 'retailer_id is required' });
        }

        // Update this SQL query to match your exact orders table column names
        const [orders] = await db.query(`
            SELECT 
                id, 
                order_number, 
                total_amount, 
                paid_amount, 
                balance, 
                order_status, 
                order_date
            FROM orders 
            WHERE retailer_id = ?
            ORDER BY order_date ASC
        `, [retailer_id]);

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ---------------------------------------------------------
// POST: Record a payment (Update orders, retailers, AND ledgers)
// ---------------------------------------------------------
router.post('/payments', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        const { 
            retailer_id, 
            amount, 
            payment_method, 
            bill_allocations 
        } = req.body;

        // 1. VALIDATE INPUT
        if (!retailer_id || !amount || amount <= 0 || !bill_allocations || bill_allocations.length === 0) {
            throw new Error('Invalid payment data');
        }

        // 2. GET CURRENT RETAILER DATA
        const [retailerRows] = await connection.query(
            'SELECT outstanding, total_purchase FROM retailers WHERE id = ?',
            [retailer_id]
        );
        
        if (retailerRows.length === 0) {
            throw new Error('Retailer not found');
        }

        const currentOutstanding = parseFloat(retailerRows[0].outstanding) || 0;
        const newOutstanding = Math.max(0, currentOutstanding - amount);

        // 3. UPDATE SPECIFIC BILLS (FIFO)
        let processedAmount = 0;
        let lastUpdatedOrderId = null;
        
        for (const alloc of bill_allocations) {
            if (!alloc.bill_id || alloc.amount_paid <= 0) continue;

            const [orderRows] = await connection.query(
                'SELECT id, balance, paid_amount FROM orders WHERE order_number = ? AND retailer_id = ?',
                [alloc.bill_id, retailer_id]
            );

            if (orderRows.length === 0) continue;

            const order = orderRows[0];
            const currentBillBalance = parseFloat(order.balance) || 0;
            const payAmount = Math.min(alloc.amount_paid, currentBillBalance);

            if (payAmount > 0) {
                // Update the order
                await connection.query(
                    `UPDATE orders 
                     SET balance = balance - ?, 
                         paid_amount = paid_amount + ? 
                     WHERE id = ?`,
                    [payAmount, payAmount, order.id]
                );
                
                lastUpdatedOrderId = order.id; 
                processedAmount += payAmount;
            }
        }

        // 4. UPDATE RETAILER TOTAL OUTSTANDING
        await connection.query(
            'UPDATE retailers SET outstanding = ? WHERE id = ?',
            [newOutstanding, retailer_id]
        );

        // 5. INSERT INTO YOUR LEDGERS TABLE
        const description = `Payment via ${payment_method}`;
        const currentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        await connection.query(
            `INSERT INTO ledgers 
             (retailer_id, order_id, type, amount, description, date, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [retailer_id, lastUpdatedOrderId, 'credit', amount, description, currentDate]
        );

        // 6. COMMIT TRANSACTION
        await connection.commit();

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                newOutstanding: newOutstanding,
                processedAmount: processedAmount
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error recording payment:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to record payment' 
        });
    } finally {
        connection.release();
    }
});

module.exports = router;