// ============================================
// uploadMiddleware.js
//
// Multer disk storage for trip-related bill photos (diesel bills, loading
// receipts, etc). Files land in server/uploads/trip-bills and are served
// back at /uploads/trip-bills/<filename> — server.js must expose that
// folder with express.static (see the one-line addition noted there).
//
//   Place in:  server/middleware/uploadMiddleware.js
// ============================================
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'trip-bills');

// multer does not create directories itself — it errors if the target is
// missing, which on a fresh deploy it always will be.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, unique);
  },
});

const fileFilter = (req, file, cb) => {
  if (/^image\/(jpe?g|png|webp)$/.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;