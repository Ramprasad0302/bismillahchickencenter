const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware, requireRole('admin'));

// Get pending orders (unassigned)
router.get('/pending', deliveryController.getPendingOrders);

// Get in-progress orders
router.get('/in-progress', deliveryController.getInProgressOrders);

// Get available drivers (from users table)
router.get('/drivers', deliveryController.getAvailableDrivers);

// Get vehicles
router.get('/vehicles', deliveryController.getVehicles);

// Get all staff (for cleaners dropdown)
router.get('/cleaners', deliveryController.getCleaners);

// Assign trip (create trip and assign orders)
router.post('/assign-trip', deliveryController.assignTrip);

module.exports = router;