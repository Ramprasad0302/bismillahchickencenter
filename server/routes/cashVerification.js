const express = require('express');
const router = express.Router();
const cashVerificationController = require('../controllers/cashVerificationController');
const { authMiddleware, requireRole } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware, requireRole('admin'));

// Admin Only Routes
router.get('/pending', cashVerificationController.getPendingVerifications);
router.get('/verified', cashVerificationController.getVerifiedHistory);
router.post('/verify', cashVerificationController.verifyPayment);

module.exports = router;