const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expensesController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/trips', expensesController.getTripsWithExpenses);
router.get('/trips/:tripId', expensesController.getTripExpenseDetail);

module.exports = router;
