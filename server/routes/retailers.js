const express = require('express');
const router = express.Router();
const retailerController = require('../controllers/retailerController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Every route here requires a logged-in user.
// Creating a retailer used to sit above this line with a comment saying
// "Admin only - but no auth here for registration", which meant anyone on the
// internet could create a retailer account (and therefore a login).
router.use(authMiddleware);

// ============================================
// Admin only
// ============================================
router.post('/', requireRole('admin'), retailerController.createRetailer);
router.get('/', requireRole('admin'), retailerController.getAllRetailers);
router.get('/customers', requireRole('admin'), retailerController.getRetailerCustomers);

// ============================================
// Retailer dashboard
// ============================================
router.get('/me', retailerController.getRetailerInfo);
router.get('/orders', retailerController.getRetailerOrders);
router.get('/stats', retailerController.getRetailerStats);

module.exports = router;
