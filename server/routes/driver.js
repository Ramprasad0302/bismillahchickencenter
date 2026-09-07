const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

router.use(authMiddleware);

router.get('/dashboard', driverController.getDriverDashboard);
router.get('/companies', driverController.getCompanies);
router.get('/trips', driverController.getDriverTrips);
router.put('/trip/status', driverController.updateTripStatus);
router.get('/collections', driverController.getDriverCollections);
router.get('/history', driverController.getDriverHistory);
router.get('/profile', driverController.getDriverProfile); // ✅ ADDED: Driver Profile

// Bill photo upload (diesel bill for now — same endpoint works for any future
// trip photo). Field name must be "photo" to match the client's FormData.
router.post('/upload-photo', upload.single('photo'), driverController.uploadTripPhoto);

module.exports = router;