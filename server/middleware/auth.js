const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');

const authMiddleware = (req, res, next) => {
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
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
      name: decoded.name,
    };

    // Kept for older controllers that read these directly.
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') message = 'Session expired. Please log in again.';
    else if (error.name === 'NotBeforeError') message = 'Token not active yet';

    console.error('❌ Auth rejected:', error.name);

    return res.status(401).json({ success: false, message });
  }
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
