// ============================================
// STRIPE ADAPTER
// Implements the gateway interface in ../paymentGateway.js
// ============================================

const config = require('../../config/payment');

let stripe = null;
const getStripe = () => {
  if (!stripe) {
    if (!config.stripe.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set in .env');
    }
    stripe = require('stripe')(config.stripe.secretKey);
  }
  return stripe;
};

// Stripe takes the smallest currency unit. INR -> paise.
const toMinorUnit = (amount) => Math.round(parseFloat(amount) * 100);
const fromMinorUnit = (minor) => parseFloat((minor / 100).toFixed(2));

// --------------------------------------------
// Create a hosted checkout page and return its URL
// --------------------------------------------
const createCheckout = async ({
  reference,
  amount,
  description,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata = {},
}) => {
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: config.currency.toLowerCase(),
          product_data: { name: description },
          unit_amount: toMinorUnit(amount),
        },
        quantity: 1,
      },
    ],
    // Our own reference travels with the session so the webhook can find the row.
    client_reference_id: reference,
    metadata: { ...metadata, reference },
    payment_intent_data: {
      metadata: { ...metadata, reference },
    },
    customer_email: customerEmail || undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return {
    providerSessionId: session.id,
    redirectUrl: session.url,
  };
};

// --------------------------------------------
// Poll a session. Used by the return page so local dev works without webhooks.
// --------------------------------------------
const retrieveCheckout = async (providerSessionId) => {
  const session = await getStripe().checkout.sessions.retrieve(providerSessionId, {
    expand: ['payment_intent'],
  });

  let status = 'pending';
  if (session.payment_status === 'paid') status = 'paid';
  else if (session.status === 'expired') status = 'failed';

  const intent = session.payment_intent;

  return {
    status,
    providerPaymentId: typeof intent === 'string' ? intent : intent?.id || null,
    amount: fromMinorUnit(session.amount_total || 0),
    raw: session,
  };
};

// --------------------------------------------
// Verify + normalise a webhook. `rawBody` MUST be the unparsed Buffer.
// --------------------------------------------
const parseWebhook = ({ rawBody, signature }) => {
  if (!config.stripe.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set in .env');
  }

  // Throws if the signature does not match — this is what stops a forged
  // "payment succeeded" call from marking bills as paid.
  const event = getStripe().webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe.webhookSecret
  );

  const object = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      if (object.payment_status !== 'paid') {
        return { type: 'ignored', eventId: event.id };
      }
      return {
        type: 'succeeded',
        eventId: event.id,
        reference: object.client_reference_id || object.metadata?.reference,
        providerSessionId: object.id,
        providerPaymentId:
          typeof object.payment_intent === 'string'
            ? object.payment_intent
            : object.payment_intent?.id || null,
        amount: fromMinorUnit(object.amount_total || 0),
        raw: object,
      };
    }

    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      return {
        type: 'failed',
        eventId: event.id,
        reference: object.client_reference_id || object.metadata?.reference,
        providerSessionId: object.id,
        reason: event.type,
        raw: object,
      };
    }

    default:
      return { type: 'ignored', eventId: event.id };
  }
};

module.exports = {
  name: 'stripe',
  createCheckout,
  retrieveCheckout,
  parseWebhook,
};
