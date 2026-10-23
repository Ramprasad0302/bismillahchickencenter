 const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// ============================================
// RETAILER ROUTES
// ============================================

// Place a new order
router.post('/', requireRole('retailer'), orderController.createOrder);

// Get my orders
router.get('/my-orders', requireRole('retailer'), orderController.getMyOrders);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all orders (Admin only)
router.get('/', requireRole('admin'), orderController.getAllOrders);

// Get single order
router.get('/:id', orderController.getOrderById);

// Update order status (Admin only)
router.put('/:id/status', requireRole('admin'), orderController.updateOrderStatus);

// ============================================
// PAYMENT ROUTES
// ============================================

// Record a payment against outstanding bills (Admin only)
router.post('/payments', requireRole('admin'), orderController.recordPayment);

module.exports = router;