<<<<<<< HEAD
// dotenv must load before anything that reads process.env at require-time
// (config/jwt.js throws if JWT_SECRET is missing, and it is required by the
// route modules below).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
=======
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de

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
<<<<<<< HEAD
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
=======
const cashVerificationRoutes = require('./routes/cashVerification'); // ✅ ADDED: Cash Verification routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow multiple origins
const allowedOrigins = [
  'https://bismillahchickencenter.com',
  'https://www.bismillahchickencenter.com',
  'http://localhost:5173',
  'http://localhost:3000'
];

// Middleware - CORS handles OPTIONS requests automatically
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked for origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

<<<<<<< HEAD
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
=======
// Request logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', { ...req.body, password: req.body.password ? '********' : undefined });
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
  }
  next();
});

<<<<<<< HEAD
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
=======
// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: '✅ Backend is working!',
    server: `Running on port ${PORT}`,
    timestamp: new Date().toISOString()
  });
});

// API Routes
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
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
<<<<<<< HEAD
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

=======
app.use('/api/cash-verification', cashVerificationRoutes); // ✅ MOUNTED: Cash Verification routes

// Add this temporary debug route
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  
  // Get all registered routes
  app._router.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      routes.push({
        path: layer.route.path,
        methods: methods
      });
    }
  });
  
  res.json({
    success: true,
    totalRoutes: routes.length,
    routes: routes
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
<<<<<<< HEAD
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
=======
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✔ Server running on port ${PORT}`);
  console.log(`📝 Available endpoints:`);
  console.log(`  → http://localhost:${PORT}/api/test`);
  console.log(`  → http://localhost:${PORT}/api/auth/login`);
  console.log(`  → http://localhost:${PORT}/api/auth/me`);
  console.log(`  → http://localhost:${PORT}/api/users`);
  console.log(`  → http://localhost:${PORT}/api/retailers`);
  console.log(`  → http://localhost:${PORT}/api/retailers/me`);
  console.log(`  → http://localhost:${PORT}/api/retailers/stats`);
  console.log(`  → http://localhost:${PORT}/api/retailers/orders`);
  console.log(`  → http://localhost:${PORT}/api/staff`);
  console.log(`  → http://localhost:${PORT}/api/vehicles`);
  console.log(`  → http://localhost:${PORT}/api/pricing/current`);
  console.log(`  → http://localhost:${PORT}/api/deliveries/pending`);
  console.log(`  → http://localhost:${PORT}/api/deliveries/in-progress`);
  console.log(`  → http://localhost:${PORT}/api/deliveries/drivers`);
  console.log(`  → http://localhost:${PORT}/api/deliveries/vehicles`);
  console.log(`  → http://localhost:${PORT}/api/deliveries/cleaners`);
  console.log(`  → http://localhost:${PORT}/api/reports/data`);
  console.log(`  → http://localhost:${PORT}/api/reports/export`);
  console.log(`  → http://localhost:${PORT}/api/driver/dashboard`);
  console.log(`  → http://localhost:${PORT}/api/driver/trip/status`);
  console.log(`  → http://localhost:${PORT}/api/cash-verification/pending`); // ✅ Added
  console.log(`  → http://localhost:${PORT}/api/cash-verification/verified`); // ✅ Added
  console.log(`  → http://localhost:${PORT}/api/cash-verification/verify`); // ✅ Added
});
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
