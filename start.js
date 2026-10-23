// ============================================
// Single entry point for hosting platforms (Hostinger, etc.)
//
// This repository holds two apps:
//   server/  -> the API      (backend.bismillahchickencenter.com)
//   client/  -> the website  (bismillahchickencenter.com)
//
// Hosting panels expect one package.json with one "start" script at the
// top of the repo, so this file decides which app to run:
//   - APP_ROLE=server or APP_ROLE=client, if set, wins;
//   - otherwise the backend is chosen when database settings (DB_HOST)
//     are present, and the website when they are not.
// That means both existing Hostinger sites work with their current
// environment variables and no extra configuration.
// ============================================
const path = require('path');
const { pathToFileURL } = require('url');

const explicit = (process.env.APP_ROLE || '').toLowerCase();
const role = explicit === 'server' || explicit === 'client'
  ? explicit
  : process.env.DB_HOST ? 'server' : 'client';

console.log(`Starting ${role === 'server' ? 'API server (server/)' : 'website (client/)'}`);

if (role === 'server') {
  require(path.join(__dirname, 'server', 'server.js'));
} else {
  // client/serve.js is an ES module.
  import(pathToFileURL(path.join(__dirname, 'client', 'serve.js')).href).catch((err) => {
    console.error('Failed to start the website:', err);
    process.exit(1);
  });
}
