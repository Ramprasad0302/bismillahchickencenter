// ============================================
// STATIC SERVER FOR THE BUILT REACT APP
// ============================================
// React Router routes like /retailer/payment/result only exist inside the
// JS bundle — there's no real file at that path. A hard navigation there
// (e.g. Stripe redirecting the browser back after checkout) makes the
// browser request that exact path from the server, and a plain static
// file server 404s because no such file exists on disk.
//
// The fix: serve real files (JS/CSS/images) as-is, but for any other GET
// request, send index.html instead of a 404. React Router then reads the
// URL and renders the right page client-side. This is the standard
// "SPA fallback" every React/Vue/Angular app needs on the server.
//
// Usage (from client/, after `npm run build`):
//   node serve.js
// Reads PORT from the environment, defaults to 3000. On Hostinger's
// Node.js app panel, set this file (client/serve.js) as the entry point
// and set the PORT it gives you as an environment variable.
// ============================================

import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Real built files (JS, CSS, images, favicon, etc.) — served as-is, with
// long-lived caching since Vite fingerprints filenames on every build.
app.use(
  express.static(DIST_DIR, {
    index: false,
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      // index.html itself must never be cached, or people get stuck on an
      // old build after you deploy a new one.
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
);

// Anything else (a client-side route, or a hard refresh on one) gets
// index.html. React Router takes over from there. (Express 5 dropped the
// bare '*' route pattern — a plain catch-all middleware works for any
// version.)
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✔ Client served on port ${PORT}`);
  console.log(`  Serving: ${DIST_DIR}`);
});