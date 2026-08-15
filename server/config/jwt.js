require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Previously both authController and middleware/auth fell back to a hardcoded
// string. That string is in the repo's git history, so anyone who has seen it
// could mint admin tokens if JWT_SECRET ever went missing in production.
// Failing to boot is the safe behaviour.
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Add a long random value to server/.env before starting the server.'
  );
}

if (JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET is too short. Use at least 32 characters — try: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
  );
}

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
