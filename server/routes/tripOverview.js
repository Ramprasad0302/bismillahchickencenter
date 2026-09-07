const express = require('express');
const router = express.Router();
const tripOverviewController = require('../controllers/tripOverviewController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/filters', tripOverviewController.getFilters);
router.get('/trips', tripOverviewController.getTrips);
router.get('/trips/:tripId', tripOverviewController.getTripDetail);

module.exports = router;