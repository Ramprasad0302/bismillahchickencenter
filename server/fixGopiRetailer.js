const pool = require('./config/db');

const fixGopi = async () => {
  try {
    console.log('🔧 Checking Gopi\'s profile...');
    
    // 1. Get Gopi's user_id
    const [users] = await pool.query('SELECT id FROM users WHERE phone = "7777777777"');
    if (users.length === 0) {
      console.log('❌ Gopi not found in users table!');
      process.exit(1);
    }
    const gopiUserId = users[0].id;

    // 2. Check which retailer_id is currently linked to Gopi
    const [retailers] = await pool.query('SELECT id, shop_name FROM retailers WHERE user_id = ?', [gopiUserId]);
    
    if (retailers.length > 0) {
      console.log(`✅ Gopi is already linked to Retailer ID: ${retailers[0].id} (${retailers[0].shop_name})`);
      console.log(`ℹ️  If Order ID 11 is complaining, check if Order 11 has retailer_id = ${retailers[0].id}`);
    } else {
      console.log('⚠️ Gopi is NOT linked to any retailer profile.');
      
      // 3. If no link exists, we update the existing 'Gopi\'s Shop' to link to Gopi
      const [gopiShop] = await pool.query('SELECT id FROM retailers WHERE shop_name = "Gopi\'s Shop" LIMIT 1');
      
      if (gopiShop.length > 0) {
        await pool.query('UPDATE retailers SET user_id = ? WHERE id = ?', [gopiUserId, gopiShop[0].id]);
        console.log(`✅ Fixed! Gopi (User ID ${gopiUserId}) is now linked to Retailer ID ${gopiShop[0].id}.`);
      } else {
        console.log('❌ No shop named "Gopi\'s Shop" found. Please create the retailer manually.');
      }
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

fixGopi();