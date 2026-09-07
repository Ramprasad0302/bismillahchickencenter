const express = require('express');
const crypto = require('crypto');
const router = express.Router();

router.post(
  '/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body.toString());
    console.log('Razorpay event received:', event.event);

    switch (event.event) {
      case 'payment.captured':
        // TODO: update order/ledger as paid
        break;
      case 'payment.failed':
        // TODO: mark order failed
        break;
      case 'order.paid':
        // TODO: mark order fully settled
        break;
    }

    res.status(200).json({ status: 'ok' });
  }
);

module.exports = router;