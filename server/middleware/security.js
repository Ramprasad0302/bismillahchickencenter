// ============================================
// Security middleware (no external dependencies)
// ============================================

const IS_DEV = process.env.NODE_ENV !== 'production';

// --------------------------------------------
// Security headers — the useful subset of helmet for a JSON API.
// --------------------------------------------
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // The API never serves HTML, so nothing should ever execute from it.
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; frame-ancestors 'none'");
  if (!IS_DEV) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

// --------------------------------------------
// Hide internal error details in production.
//
// Many controllers put error.message (SQL errors, table/column names, stack
// hints) into their 500 responses. Instead of trusting every handler, any
// 5xx JSON body is scrubbed here before it leaves the server. The real error
// is still logged by the controller with console.error.
// --------------------------------------------
const LEAKY = /(ER_|ECONN|ETIMEDOUT|sql|syntax|column|table|database|Error:|undefined|null|Cannot |is not |stack|at \w+ \()/i;

const scrubServerErrors = (req, res, next) => {
  if (IS_DEV) return next();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && typeof body === 'object') {
      const clean = { ...body };
      delete clean.error;
      delete clean.details;
      delete clean.stack;
      delete clean.sql;
      if (typeof clean.message !== 'string' || LEAKY.test(clean.message)) {
        clean.message = 'Something went wrong. Please try again.';
      }
      return json(clean);
    }
    return json(body);
  };
  next();
};

// --------------------------------------------
// In-memory fixed-window rate limiter.
// Fine for a single Node process; counts reset on restart.
// --------------------------------------------
const createLimiter = ({ windowMs, max, keyFn, message }) => {
  const hits = new Map();

  // Periodically drop expired windows so the map can't grow forever.
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs).unref();

  const limiter = (req, res, next) => {
    const keys = keyFn(req).filter(Boolean);
    const now = Date.now();
    for (const key of keys) {
      const entry = hits.get(key);
      if (entry && entry.reset > now && entry.count >= max) {
        res.setHeader('Retry-After', Math.ceil((entry.reset - now) / 1000));
        return res.status(429).json({ success: false, message });
      }
    }
    req.rateLimitKeys = keys;
    next();
  };

  // Called by the route when an attempt should count (e.g. a failed login).
  limiter.hit = (keys) => {
    const now = Date.now();
    for (const key of keys || []) {
      const entry = hits.get(key);
      if (!entry || entry.reset <= now) hits.set(key, { count: 1, reset: now + windowMs });
      else entry.count += 1;
    }
  };

  limiter.reset = (keys) => {
    for (const key of keys || []) hits.delete(key);
  };

  return limiter;
};

// Login brute-force protection: 10 failed attempts per phone number and 30
// per IP address within 15 minutes. Keyed on the phone as well as the IP so a
// rotating IP still can't hammer one account.
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_MESSAGE = 'Too many failed login attempts. Please wait 15 minutes and try again.';
const phoneLimiter = createLimiter({
  windowMs: LOGIN_WINDOW,
  max: 10,
  keyFn: (req) => [typeof req.body?.phone === 'string' ? `phone:${req.body.phone}` : null],
  message: LOGIN_MESSAGE,
});
const ipLoginLimiter = createLimiter({
  windowMs: LOGIN_WINDOW,
  max: 30,
  keyFn: (req) => [`ip:${req.ip}`],
  message: LOGIN_MESSAGE,
});

const loginLimiter = (req, res, next) =>
  ipLoginLimiter(req, res, () => {
    const ipKeys = req.rateLimitKeys;
    phoneLimiter(req, res, () => {
      const phoneKeys = req.rateLimitKeys;
      // Count failures once the login handler has answered; a successful
      // login clears that phone's counter.
      res.on('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 400) {
          ipLoginLimiter.hit(ipKeys);
          phoneLimiter.hit(phoneKeys);
        } else if (res.statusCode < 300) {
          phoneLimiter.reset(phoneKeys);
        }
      });
      next();
    });
  });

// General API ceiling per IP — stops scripted floods without affecting
// normal use (600 requests / 5 minutes).
const apiLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 600,
  keyFn: (req) => [`ip:${req.ip}`],
  message: 'Too many requests. Please slow down.',
});
const countApiRequests = (req, res, next) => {
  apiLimiter.hit(req.rateLimitKeys);
  next();
};

module.exports = {
  securityHeaders,
  scrubServerErrors,
  loginLimiter,
  apiLimiter,
  countApiRequests,
};
