const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const authMiddleware = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get current pricing for the public (e.g. for the landing page)
router.get('/current', pricingController.getCurrentPricing);

// ============================================
// PROTECTED ROUTES (Require Login)
// ============================================

// Get all data for the Admin Pricing page (Global + Custom Prices)
router.get('/admin-data', authMiddleware, pricingController.getAdminPricingData);

// Get the full history of default price / avg weight changes
router.get('/history', authMiddleware, pricingController.getPriceHistory);

// Update the Global Price (Admin only)
router.post('/global', authMiddleware, pricingController.updateGlobalPrice);

// Set or Update a Custom Price for a specific Retailer
router.post('/custom', authMiddleware, pricingController.updateCustomPrice);

// Revert a Custom Price back to Default
router.delete('/custom/:retailerId', authMiddleware, pricingController.deleteCustomPrice);

// Get the specific price for the currently logged-in Retailer
router.get('/retailer-price', authMiddleware, pricingController.getRetailerPrice);

module.exports = router;