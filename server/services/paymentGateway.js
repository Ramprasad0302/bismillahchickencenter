// ============================================
// GATEWAY RESOLVER
//
// Every adapter must expose:
//   name             string
//   createCheckout({ reference, amount, description, customerEmail,
//                    customerPhone, customerName, successUrl, cancelUrl,
//                    metadata })
//                    -> { providerSessionId, redirectUrl }
//   retrieveCheckout(providerSessionId)
//                    -> { status: 'paid'|'pending'|'failed',
//                         providerPaymentId, amount, raw }
//   parseWebhook({ rawBody, signature })
//                    -> { type: 'succeeded'|'failed'|'ignored', eventId,
//                         reference, providerSessionId, providerPaymentId,
//                         amount, reason, raw }
//                    Throws if the signature is invalid.
// ============================================

const config = require('./../config/payment');

const adapters = {
  stripe: () => require('./gateways/stripeGateway'),
  razorpay: () => require('./gateways/razorpayGateway'),
};

const getGateway = () => {
  const load = adapters[config.provider];
  if (!load) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${config.provider}". Use one of: ${Object.keys(adapters).join(', ')}`
    );
  }
  return load();
};

module.exports = { getGateway };
