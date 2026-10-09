// dotenv must load before anything that reads process.env at require-time
// (config/jwt.js throws if JWT_SECRET is missing, and it is required by the
// route modules below).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const zlib = require('zlib');
const ensureIndexes = require('./config/ensureIndexes');
const {
  securityHeaders,
  scrubServerErrors,
  loginLimiter,
  apiLimiter,
  countApiRequests,
} = require('./middleware/security');

const IS_DEV = process.env.NODE_ENV !== 'production';

// ============================================
// Silence console.log/console.info/console.debug in production.
//
// The codebase has many console.log calls across controllers and scripts,
// used during development. Rather than touching every one of those files,
// this mutes them all at once by overriding the console methods themselves
// before any route module is required below -- every controller's later
// `console.log(...)` calls become no-ops in production automatically.
//
// console.error and console.warn are left untouched on purpose: those are
// server-side terminal/log output only you see via SSH or PM2 logs -- never
// exposed to a website visitor -- and are exactly what you want when
// something breaks in production.
// ============================================
if (!IS_DEV) {
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const retailerRoutes = require('./routes/retailers');
const staffRoutes = require('./routes/staff');
const vehicleRoutes = require('./routes/vehicles');
const pricingRoutes = require('./routes/pricing');
const orderRoutes = require('./routes/orders');
const deliveryRoutes = require('./routes/deliveries');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const driverRoutes = require('./routes/driver');
const cashVerificationRoutes = require('./routes/cashVerification');
const paymentRoutes = require('./routes/payments'); // 💳 Online payments (Stripe / Razorpay)
const expensesRoutes = require('./routes/expenses'); // admin trip expenses view
const salariesRoutes = require('./routes/salaries'); // admin driver/staff salary tracking
const tripOverviewRoutes = require('./routes/tripOverview'); // admin loaded-vs-delivered reconciliation

const app = express();
const PORT = process.env.PORT || 5000;

// Don't advertise the framework.
app.disable('x-powered-by');

// Behind Hostinger's / any reverse proxy, req.ip must come from the proxy's
// X-Forwarded-For header or every visitor looks like the same IP (which
// would make the rate limits below hit everyone at once). Override with
// TRUST_PROXY=0 if the app is ever exposed directly.
app.set('trust proxy', process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : 1);

app.use(securityHeaders);

// ============================================
// CORS
// ============================================
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  [
    'https://bismillahchickencenter.com',
    'https://www.bismillahchickencenter.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ].join(',')
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      if (IS_DEV && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      console.warn('❌ CORS blocked:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ============================================
// Body parsing
// ============================================
// 💳 The payment webhook must keep its raw body. Signature verification hashes
// the exact bytes the gateway sent; once express.json() parses and
// re-serialises them, every signature check fails. This mount has to stay
// above express.json(). Both Stripe and Razorpay post to this same path —
// handleWebhook picks the right verifier based on which signature header
// is present.
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));

// Size limits stop oversized bodies being used to exhaust memory.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Rate limits: a general per-IP ceiling, plus brute-force protection on login.
app.use('/api', apiLimiter, countApiRequests);
app.use('/api/auth/login', (req, res, next) => (req.method === 'POST' ? loginLimiter(req, res, next) : next()));

// Never send SQL/stack details to the browser in production.
app.use(scrubServerErrors);

// ============================================
// Gzip JSON responses
//
// List endpoints (orders, ledgers, payments...) return large JSON arrays;
// gzip shrinks them by ~85%, which is most of the wait on a mobile
// connection. Done with Node's built-in zlib so no extra dependency has to
// be installed on the host. Skips small bodies and anything that is not JSON
// (Excel/CSV exports, uploaded photos).
// ============================================
app.use((req, res, next) => {
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return next();
  const send = res.send.bind(res);
  res.send = (body) => {
    const type = String(res.getHeader('Content-Type') || '');
    if (
      (typeof body !== 'string' && !Buffer.isBuffer(body)) ||
      !type.includes('json') ||
      res.getHeader('Content-Encoding') ||
      Buffer.byteLength(body) < 1024
    ) {
      return send(body);
    }
    zlib.gzip(body, (err, compressed) => {
      if (err) return send(body);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.removeHeader('Content-Length');
      send(compressed);
    });
    return res;
  };
  next();
});

// ============================================
// Static files — uploaded trip bill photos (diesel bills, etc)
// Served at /uploads/trip-bills/<filename>, written by
// middleware/uploadMiddleware.js via the POST /api/driver/upload-photo route.
// ============================================
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), { dotfiles: 'deny', index: false, fallthrough: true })
);

// ============================================
// Request logging -- dev only. In production this line would otherwise be
// the single noisiest thing in the logs (one line per request); it's
// wrapped in IS_DEV directly rather than relying only on the console.log
// override above, so it costs nothing at all in production instead of
// running and silently discarding its output.
// ============================================
const SENSITIVE_FIELDS = [
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'authorization',
];

const redact = (body) => {
  const copy = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (copy[field] !== undefined) copy[field] = '********';
  }
  return copy;
};

if (IS_DEV) {
  app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url}`);
    // Buffer check: the webhook body is a raw Buffer, not a plain object.
    if (
      req.body &&
      !Buffer.isBuffer(req.body) &&
      Object.keys(req.body).length > 0
    ) {
      console.log('📦 Body:', redact(req.body));
    }
    next();
  });
}

// ============================================
// Health check
// ============================================
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Backend is working!',
    server: `Running on port ${PORT}`,
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/retailers', retailerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/cash-verification', cashVerificationRoutes);
app.use('/api/payments', paymentRoutes); // 💳 Online payments
app.use('/api/expenses', expensesRoutes);
app.use('/api/salaries', salariesRoutes);
app.use('/api/trip-overview', tripOverviewRoutes); // admin loaded-vs-delivered reconciliation

// The old /api/debug-routes handler read app._router, which no longer exists
// in Express 5 — it would have thrown. It also published the full route map
// to anyone who asked, so it has been removed rather than fixed.

// ============================================
// 404
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// ============================================
// Error handler
// ============================================
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }

  // Client mistakes (bad JSON, body too large, rejected upload) are 4xx, not 500.
  const status = err?.status || err?.statusCode;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ success: false, message: status === 413 ? 'Request is too large' : 'Invalid request' });
  }
  if (err?.name === 'MulterError' || /Only JPG, PNG, or WEBP/.test(err?.message || '')) {
    return res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 5 MB or smaller' : err.message,
    });
  }

  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: IS_DEV ? err.message : undefined,
  });
});

// ============================================
// Start
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  ensureIndexes();
  console.log(`✔ Server running on port ${PORT} (${IS_DEV ? 'development' : 'production'})`);
  console.log(`💳 Payment provider: ${process.env.PAYMENT_PROVIDER || 'stripe'}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`  → http://localhost:${PORT}/api/test`);
  console.log(`  → http://localhost:${PORT}/api/payments/summary`);
  console.log(`  → http://localhost:${PORT}/api/payments/checkout`);
  console.log(`  → http://localhost:${PORT}/api/payments/webhook`);
});