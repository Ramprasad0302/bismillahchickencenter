const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');

// Staff CRUD routes (without authentication for now)
router.route('/')
  .get(staffController.getAllStaff)
  .post(staffController.addStaff);

router.route('/:id')
  .put(staffController.updateStaff)
  .delete(staffController.deleteStaff);

router.patch('/:id/status', staffController.toggleStaffStatus);

module.exports = router;