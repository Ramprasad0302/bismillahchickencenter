// Builds the website for the Android app and copies it into android/.
// Push notifications in the app are switched on only when Firebase is
// configured (android/app/google-services.json exists) — registering for
// push without it would crash the app.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const firebase = existsSync('android/app/google-services.json');
console.log(firebase
  ? '✔ google-services.json found: app push notifications ENABLED'
  : '⚠ google-services.json missing: app push notifications DISABLED (in-app bell still works)');

const env = { ...process.env, VITE_ANDROID_PUSH: firebase ? '1' : '' };
execSync('npx vite build', { stdio: 'inherit', env });
execSync('npx cap sync android', { stdio: 'inherit', env });
