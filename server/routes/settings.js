const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Business Settings
router.get('/business', requireRole('admin'), settingsController.getBusinessSettings);
router.put('/business', requireRole('admin'), settingsController.updateBusinessSettings);

// Account Settings
router.get('/account', settingsController.getAccountSettings);
router.put('/account', settingsController.updateAccountSettings);

// Security (Password)
router.put('/password', settingsController.changePassword);

module.exports = router;