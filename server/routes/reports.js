const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/dashboard', reportController.getDashboard);
router.get('/data', reportController.getReportData);
router.get('/export', reportController.exportReport);

module.exports = router;