// ============================================
// RAZORPAY ADAPTER  — not active yet
//
// This file exists so the swap later is: npm i razorpay, fill in the keys,
// set PAYMENT_PROVIDER=razorpay. Nothing in the controllers or the React app
// changes, because it returns the same shapes as stripeGateway.js.
//
// It uses Payment Links (which return a hosted URL) rather than the Razorpay
// Checkout modal, so the "backend returns a redirect URL" contract holds for
// both gateways. If you'd rather use the modal, change createCheckout to
// return { orderId, keyId } and open Checkout on the client instead.
// ============================================

const crypto = require('crypto');
const config = require('../../config/payment');

let client = null;
const getClient = () => {
  if (!client) {
    if (!config.razorpay.keyId || !config.razorpay.keySecret) {
      throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set in .env');
    }
    const Razorpay = require('razorpay');
    client = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }
  return client;
};

const toMinorUnit = (amount) => Math.round(parseFloat(amount) * 100);
const fromMinorUnit = (minor) => parseFloat((minor / 100).toFixed(2));

const createCheckout = async ({
  reference,
  amount,
  description,
  customerEmail,
  customerPhone,
  customerName,
  successUrl,
  metadata = {},
}) => {
  const link = await getClient().paymentLink.create({
    amount: toMinorUnit(amount),
    currency: config.currency.toUpperCase(),
    description,
    reference_id: reference,
    customer: {
      name: customerName || undefined,
      email: customerEmail || undefined,
      contact: customerPhone || undefined,
    },
    notify: { sms: false, email: false },
    callback_url: successUrl,
    callback_method: 'get',
    notes: { ...metadata, reference },
  });

  return {
    providerSessionId: link.id,
    redirectUrl: link.short_url,
  };
};

const retrieveCheckout = async (providerSessionId) => {
  const link = await getClient().paymentLink.fetch(providerSessionId);

  let status = 'pending';
  if (link.status === 'paid') status = 'paid';
  else if (link.status === 'cancelled' || link.status === 'expired') status = 'failed';

  return {
    status,
    providerPaymentId: link.payments?.[0]?.payment_id || null,
    amount: fromMinorUnit(link.amount_paid || link.amount || 0),
    raw: link,
  };
};

const parseWebhook = ({ rawBody, signature }) => {
  if (!config.razorpay.webhookSecret) {
    throw new Error('RAZORPAY_WEBHOOK_SECRET is not set in .env');
  }

  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    throw new Error('Invalid Razorpay webhook signature');
  }

  const event = JSON.parse(rawBody.toString('utf8'));
  const entity =
    event.payload?.payment_link?.entity || event.payload?.payment?.entity || {};

  switch (event.event) {
    case 'payment_link.paid':
      return {
        type: 'succeeded',
        eventId: event.payload?.payment?.entity?.id || entity.id,
        reference: entity.reference_id || entity.notes?.reference,
        providerSessionId: entity.id,
        providerPaymentId: event.payload?.payment?.entity?.id || null,
        amount: fromMinorUnit(entity.amount_paid || entity.amount || 0),
        raw: entity,
      };

    case 'payment_link.cancelled':
    case 'payment_link.expired':
    case 'payment.failed':
      return {
        type: 'failed',
        eventId: entity.id,
        reference: entity.reference_id || entity.notes?.reference,
        providerSessionId: entity.id,
        reason: event.event,
        raw: entity,
      };

    default:
      return { type: 'ignored', eventId: event.event };
  }
};

module.exports = {
  name: 'razorpay',
  createCheckout,
  retrieveCheckout,
  parseWebhook,
};
