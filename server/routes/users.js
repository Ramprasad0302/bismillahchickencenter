const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

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
router.patch('/:id/lastlogin', userController.updateLastLogin);

module.exports = router;