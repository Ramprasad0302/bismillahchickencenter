const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const controller = require('../controllers/notificationController');

// Every signed-in user (admin, retailer, driver) has their own alerts.
router.use(authMiddleware);

router.get('/', controller.list);
router.post('/read', controller.markRead);
router.get('/vapid-public-key', controller.vapidPublicKey);
router.post('/subscribe', controller.subscribe);
router.post('/unsubscribe', controller.unsubscribe);
router.post('/test', controller.test);

module.exports = router;
