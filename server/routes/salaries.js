const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salaryController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/summary', salaryController.getSalarySummary);
router.get('/detail', salaryController.getSalaryDetail);
router.post('/advance', salaryController.addAdvance);
router.put('/daily-salary', salaryController.updateDailySalary);

module.exports = router;
