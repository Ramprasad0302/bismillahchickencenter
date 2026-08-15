const jwt = require('jsonwebtoken');
<<<<<<< HEAD
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

=======

const authMiddleware = (req, res, next) => {
  try {
    // Get Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      console.log('❌ No Authorization header');
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing'
      });
    }

    // Extract token
    let token = authHeader;
    if (token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    console.log('=================================');
    console.log('🔑 Received Token:');
    console.log(token);
    console.log('=================================');

    // ✅ CRITICAL: Use the SAME JWT_SECRET as in authController
    const JWT_SECRET = process.env.JWT_SECRET || 'bismilla_chicken_center_2026_super_secret_key';
    
    console.log('=================================');
    console.log('🔑 VERIFY SECRET:', JWT_SECRET);
    console.log('=================================');

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    console.log('✅ Token decoded:', decoded);

    // Set req.user with the decoded data
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    req.user = {
      id: decoded.id,
      phone: decoded.phone,
      role: decoded.role,
<<<<<<< HEAD
      name: decoded.name,
    };

    // Kept for older controllers that read these directly.
=======
      name: decoded.name
    };

    // Also keep these for backward compatibility
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
    req.userId = decoded.id;
    req.userRole = decoded.role;

    next();
<<<<<<< HEAD
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
=======

  } catch (error) {
    console.error('❌ JWT Verification Error:', error.message);
    
    // Different error messages for different JWT errors
    let message = 'Invalid token';
    if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
    } else if (error.name === 'TokenExpiredError') {
      message = 'Token expired. Please login again.';
    } else if (error.name === 'NotBeforeError') {
      message = 'Token not active yet';
    }

    return res.status(401).json({
      success: false,
      message: message,
      error: error.message
    });
  }
};

module.exports = authMiddleware;
>>>>>>> 41200f985f941827fe20e4c08fe95b2338d412de
