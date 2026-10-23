const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const pool = require('../config/db');

// A token stays cryptographically valid until it expires (days), so on its
// own it would keep a deactivated, deleted or demoted user signed in. Each
// request re-checks the account; results are cached for 30s per user so this
// costs at most one primary-key lookup per user every 30 seconds.
const ACCOUNT_TTL_MS = 30 * 1000;
const accountCache = new Map();

const loadAccount = async (id) => {
  const hit = accountCache.get(id);
  if (hit && hit.at > Date.now() - ACCOUNT_TTL_MS) return hit.account;
  const [rows] = await pool.query('SELECT id, role, status FROM users WHERE id = ?', [id]);
  const account = rows[0] || null;
  accountCache.set(id, { at: Date.now(), account });
  if (accountCache.size > 5000) accountCache.clear();
  return account;
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing',
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader.trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    // The old version logged the secret and the full token on every request.
    // Anything that reaches a log file, a screen share, or a hosting provider's
    // log viewer is effectively public — so neither is logged now.
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    let account;
    try {
      account = await loadAccount(decoded.id);
    } catch (dbError) {
      console.error('❌ Auth account lookup failed:', dbError.message);
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    }
    if (!account || account.status !== 'active' || account.role !== decoded.role) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }

    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      name: decoded.name,
    };

    // Kept for older controllers that read these directly.
    req.userId = decoded.id;
    req.userRole = decoded.role;
  } catch (error) {
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') message = 'Session expired. Please log in again.';
    else if (error.name === 'NotBeforeError') message = 'Token not active yet';

    console.error('❌ Auth rejected:', error.name);

    return res.status(401).json({ success: false, message });
  }

  // Outside the try so an error further down the chain is never misreported
  // as an invalid token.
  next();
};

// ============================================
// Role guard. Use after authMiddleware:
//   router.post('/', authMiddleware, requireRole('admin'), handler)
// ============================================
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to do that',
    });
  }
  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;
