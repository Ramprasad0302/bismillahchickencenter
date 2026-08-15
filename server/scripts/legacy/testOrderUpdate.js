const pool = require('../../config/db'); // Adjust path if your config is elsewhere

const testUpdate = async () => {
    try {
        // 👇 CHANGE THIS to one of your actual order numbers from your screenshot!
        const testOrderNumber = 'BIS-20260805-0010'; 

        console.log(`🛠️ Attempting to manually update order: ${testOrderNumber}`);
        
        const [result] = await pool.query(`
            UPDATE orders 
            SET order_status = 'delivered', 
                delivered_date = CURDATE() 
            WHERE order_number = ?
        `, [testOrderNumber]);

        if (result.affectedRows > 0) {
            console.log(`✅ SUCCESS! Order ${testOrderNumber} is now marked as delivered.`);
        } else {
            console.log(`⚠️ Order ${testOrderNumber} not found, or it was already delivered.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ DATABASE ERROR:', error.message);
        process.exit(1);
    }
};

testUpdate();