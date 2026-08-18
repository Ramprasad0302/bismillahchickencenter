// dotenv must load before anything that reads process.env at require-time
// (config/jwt.js throws if JWT_SECRET is missing, and it is required by the
// route modules below).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

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

const app = express();
const PORT = process.env.PORT || 5000;
const IS_DEV = process.env.NODE_ENV !== 'production';

// ============================================
// CORS
// ============================================
// The previous version built an allow-list and then called callback(null, true)
// in the else branch too — so a "blocked" origin was logged and then allowed.
// Combined with credentials: true that let any site on the internet make
// authenticated requests. Blocked origins are now actually blocked.
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
      // No Origin header: curl, Postman, server-to-server, mobile webviews.
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // In development, allow any localhost port so Vite can move around.
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
// above express.json().
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// Static files — uploaded trip bill photos (diesel bills, etc)
// Served at /uploads/trip-bills/<filename>, written by
// middleware/uploadMiddleware.js via the POST /api/driver/upload-photo route.
// ============================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// Request logging
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

app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  // Buffer check: the webhook body is a raw Buffer, not a plain object.
  if (
    IS_DEV &&
    req.body &&
    !Buffer.isBuffer(req.body) &&
    Object.keys(req.body).length > 0
  ) {
    console.log('📦 Body:', redact(req.body));
  }
  next();
});

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
  console.log(`✔ Server running on port ${PORT} (${IS_DEV ? 'development' : 'production'})`);
  console.log(`💳 Payment provider: ${process.env.PAYMENT_PROVIDER || 'stripe'}`);
  console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`  → http://localhost:${PORT}/api/test`);
  console.log(`  → http://localhost:${PORT}/api/payments/summary`);
  console.log(`  → http://localhost:${PORT}/api/payments/checkout`);
  console.log(`  → http://localhost:${PORT}/api/payments/webhook`);
});