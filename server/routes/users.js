const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const userController = require('../controllers/userController');

// Admin only: every route below needs a signed-in admin.
router.use(authMiddleware, requireRole('admin'));

// User CRUD routes
router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUserById)
  .put(userController.updateUser)
  .delete(userController.deleteUser);

router.patch('/:id/status', userController.toggleUserStatus);
router.patch('/:id/password', userController.updatePassword);

module.exports = router;