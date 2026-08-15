const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// ============================================
// 1. GET BUSINESS SETTINGS
// ============================================
exports.getBusinessSettings = async (req, res) => {
    try {
        // For now, we return a static object since we didn't create a business table.
        return res.json({
            success: true,
            data: {
                businessName: 'Bismillah Chicken Center',
                phone: '+91 9876543210',
                email: 'info@bismillahchicken.com',
                address: '12 Market Road, Hyderabad'
            }
        });
        
    } catch (error) {
        console.error('Error fetching business settings:', error);
        res.status(500).json({ success: false, message: 'Failed to load business settings' });
    }
};

// ============================================
// 2. UPDATE BUSINESS SETTINGS
// ============================================
exports.updateBusinessSettings = async (req, res) => {
    try {
        const { businessName, phone, email, address } = req.body;
        // Save to DB here in the future. For now, just return success.
        
        res.json({ success: true, message: 'Business settings updated successfully!' });
    } catch (error) {
        console.error('Error updating business settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update business settings' });
    }
};

// ============================================
// 3. GET ACCOUNT SETTINGS (Admin Profile)
// ============================================
exports.getAccountSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const [users] = await pool.query(
            'SELECT id, name, phone, email FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: users[0] });
    } catch (error) {
        console.error('Error fetching account settings:', error);
        res.status(500).json({ success: false, message: 'Failed to load account settings' });
    }
};

// ============================================
// 4. UPDATE ACCOUNT SETTINGS (Admin Profile)
// ============================================
exports.updateAccountSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, phone } = req.body;

        await pool.query(
            'UPDATE users SET name = ?, phone = ? WHERE id = ?',
            [name, phone, userId]
        );

        res.json({ success: true, message: 'Account updated successfully!' });
    } catch (error) {
        console.error('Error updating account settings:', error);
        res.status(500).json({ success: false, message: 'Failed to update account settings' });
    }
};

// ============================================
// 5. CHANGE PASSWORD
// ============================================
exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // 1. Get the user's current hashed password from DB
        const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // 2. Compare current password
        const isValid = await bcrypt.compare(currentPassword, users[0].password);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        // 3. Hash the new password and save
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

        res.json({ success: true, message: 'Password changed successfully!' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'Failed to change password' });
    }
};