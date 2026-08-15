const pool = require('./config/db'); // Make sure this path matches your DB connection

const fixOrderStatus = async () => {
    try {
        console.log('🔧 Checking and fixing order_status column...');
        
        // This ALTER command expands the allowed values to include 'delivered'
        await pool.query(`
            ALTER TABLE orders 
            MODIFY COLUMN order_status 
            ENUM('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled') 
            DEFAULT 'pending'
        `);
        
        console.log('✅ Success! order_status column updated to accept "delivered".');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error altering table:', error.message);
        process.exit(1);
    }
};

fixOrderStatus();