const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth'); // ✅ Make sure this is imported

// Public routes
router.post('/login', authController.login);

// ✅ Protected routes (Add authMiddleware here!)
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;