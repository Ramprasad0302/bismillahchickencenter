const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const staffController = require('../controllers/staffController');

// Admin only: every route below needs a signed-in admin.
router.use(authMiddleware, requireRole('admin'));

// Staff CRUD routes (without authentication for now)
router.route('/')
  .get(staffController.getAllStaff)
  .post(staffController.addStaff);

router.route('/:id')
  .put(staffController.updateStaff)
  .delete(staffController.deleteStaff);

router.patch('/:id/status', staffController.toggleStaffStatus);

module.exports = router;