const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/auth');

// ============================================
// WEBHOOK — must stay above router.use(authMiddleware).
// The gateway has no JWT; it proves itself with a signature instead.
// The raw-body parser for this path is mounted in server.js.
// ============================================
router.post('/webhook', paymentController.handleWebhook);

// ============================================
// Everything below needs a logged-in user
// ============================================
router.use(authMiddleware);

router.get('/', paymentController.getPayments);
router.get('/summary', paymentController.getPaymentSummary);
router.post('/checkout', paymentController.createCheckout);
router.get('/status/:reference', paymentController.getTransactionStatus);
router.post('/cancel/:reference', paymentController.cancelTransaction);

module.exports = router;