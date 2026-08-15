// ============================================
// PAYMENT CONFIG
// One switch decides which gateway is live.
// Change PAYMENT_PROVIDER=razorpay in .env later — no other file changes.
// ============================================

const PROVIDER = (process.env.PAYMENT_PROVIDER || 'stripe').toLowerCase();

const config = {
  provider: PROVIDER,

  // Currency used for every online payment. Stripe wants lowercase, Razorpay uppercase.
  currency: process.env.PAYMENT_CURRENCY || 'INR',

  // Where the gateway sends the customer back to.
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
};

// The ledger table name differs between createTables.js ('ledger') and
// orderController.recordPayment ('ledgers'). Set LEDGER_TABLE in .env if yours
// is named differently. See the notes file — this mismatch is an existing bug.
config.ledgerTable = process.env.LEDGER_TABLE || 'ledger';

module.exports = config;
