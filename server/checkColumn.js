const pool = require('./config/db');

const checkColumn = async () => {
    try {
        console.log('🔍 Checking order_status column type...');
        
        // Query the column definition
        const [rows] = await pool.query(`
            SHOW COLUMNS FROM orders WHERE Field = 'order_status'
        `);
        
        if (rows.length === 0) {
            console.log('❌ The column "order_status" was not found in the orders table!');
            process.exit(1);
        }

        console.log('✅ Column found!');
        console.log('--------------------------------');
        console.log('📝 Column Type:', rows[0].Type);
        console.log('📝 Nullable:', rows[0].Null);
        console.log('📝 Default:', rows[0].Default);
        console.log('--------------------------------');

        // Check if it's an ENUM and if 'delivered' is allowed
        if (rows[0].Type.startsWith('enum')) {
            if (rows[0].Type.includes("'delivered'")) {
                console.log('✅ SUCCESS: The ENUM contains "delivered". The database is correct.');
            } else {
                console.log('❌ ERROR: The ENUM does NOT contain "delivered". You need to run the fix script.');
            }
        } else {
            console.log('ℹ️ The column is not an ENUM (it is', rows[0].Type, '). This is usually fine.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Database Error:', error.message);
        process.exit(1);
    }
};

checkColumn();