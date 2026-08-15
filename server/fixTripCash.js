const pool = require('./config/db');

const fixTripCash = async () => {
    try {
        console.log('🔄 Checking for completed trips with unverified cash...');

        // 1. Find trips that are marked 'completed' in the trips table
        // 2. Find the total cash collected from trip_orders
        // 3. Insert them into cash_verifications if they don't already exist
        const [result] = await pool.query(`
            INSERT INTO cash_verifications (driver_id, trip_number, total_cash_collected, diesel_expense, status, submitted_at)
            SELECT 
                t.driver_id,
                t.trip_number,
                SUM(tos.cash_collected) as total_cash,
                0 as diesel_expense, -- Defaulting to 0 for now
                'pending',
                NOW()
            FROM trips t
            JOIN trip_orders tos ON t.id = tos.trip_id
            WHERE t.status = 'completed'
            AND NOT EXISTS (
                SELECT 1 FROM cash_verifications cv WHERE cv.trip_number = t.trip_number
            )
            GROUP BY t.id, t.driver_id, t.trip_number
            HAVING total_cash > 0
        `);

        if (result.affectedRows > 0) {
            console.log(`✅ Successfully inserted ${result.affectedRows} trip(s) into cash_verifications!`);
        } else {
            console.log('ℹ️ No new completed trips with cash found to insert.');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error fixing trip cash:', error.message);
        process.exit(1);
    }
};

fixTripCash();