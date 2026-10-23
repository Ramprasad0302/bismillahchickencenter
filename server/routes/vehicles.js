const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const vehicleController = require('../controllers/vehicleController');

// Admin only: every route below needs a signed-in admin.
router.use(authMiddleware, requireRole('admin'));

// Vehicle CRUD routes (without authentication for now)
router.route('/')
  .get(vehicleController.getAllVehicles)
  .post(vehicleController.addVehicle);

router.route('/:id')
  .get(vehicleController.getVehicleById)
  .put(vehicleController.updateVehicle)
  .delete(vehicleController.deleteVehicle);

router.patch('/:id/status', vehicleController.toggleVehicleStatus);
router.patch('/:id/trips', vehicleController.updateVehicleTrips);

module.exports = router;