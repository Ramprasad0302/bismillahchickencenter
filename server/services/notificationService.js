// ============================================
// Notifications
//
// One call — notify(userIds, { title, body, link, type }) — does three things:
//   1. stores the alert in `notifications` (the bell in the app/website);
//   2. sends a Web Push to every browser the user enabled alerts on, which
//      arrives even when the website is closed (VAPID keys are generated and
//      stored automatically on first use);
//   3. sends a Firebase Cloud Messaging push to the user's Android app, when
//      FCM_SERVICE_ACCOUNT is configured.
//
// Sending never throws and never delays the request that triggered it: the
// work runs after the response with setImmediate, and every failure is only
// logged. A failed push must never fail an order, a payment or a price change.
// ============================================
const crypto = require('crypto');
const fs = require('fs');
const webpush = require('web-push');
const pool = require('../config/db');

const IS_DEV = process.env.NODE_ENV !== 'production';

// --------------------------------------------
// Tables (created on startup, idempotent)
// --------------------------------------------
const ensureNotificationTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(40) NOT NULL DEFAULT 'general',
        title VARCHAR(160) NOT NULL,
        body VARCHAR(500) NOT NULL DEFAULT '',
        link VARCHAR(255) NULL,
        read_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user_created (user_id, created_at),
        INDEX idx_notif_user_unread (user_id, read_at)
      ) DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        kind VARCHAR(10) NOT NULL,
        endpoint_hash CHAR(64) NOT NULL,
        data TEXT NOT NULL,
        user_agent VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME NULL,
        UNIQUE KEY uniq_push_endpoint (endpoint_hash),
        INDEX idx_push_user (user_id)
      ) DEFAULT CHARSET=utf8mb4`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT NOT NULL
      ) DEFAULT CHARSET=utf8mb4`);
    // Keep the bell fast: alerts older than 90 days are dropped.
    await pool.query('DELETE FROM notifications WHERE created_at < NOW() - INTERVAL 90 DAY');
  } catch (error) {
    console.error('❌ Could not prepare notification tables:', error.message);
  }
};

// --------------------------------------------
// Web Push (VAPID)
// --------------------------------------------
let vapidReady = null;

const getVapidKeys = () => {
  if (!vapidReady) {
    vapidReady = (async () => {
      let publicKey = process.env.VAPID_PUBLIC_KEY;
      let privateKey = process.env.VAPID_PRIVATE_KEY;

      if (!publicKey || !privateKey) {
        const [rows] = await pool.query(
          "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('vapid_public_key', 'vapid_private_key')"
        );
        const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
        publicKey = map.vapid_public_key;
        privateKey = map.vapid_private_key;

        if (!publicKey || !privateKey) {
          const keys = webpush.generateVAPIDKeys();
          publicKey = keys.publicKey;
          privateKey = keys.privateKey;
          await pool.query(
            `INSERT INTO app_settings (setting_key, setting_value) VALUES
               ('vapid_public_key', ?), ('vapid_private_key', ?)
             ON DUPLICATE KEY UPDATE setting_value = setting_value`,
            [publicKey, privateKey]
          );
          // Re-read in case another process won the race.
          const [again] = await pool.query(
            "SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('vapid_public_key', 'vapid_private_key')"
          );
          const m2 = Object.fromEntries(again.map((r) => [r.setting_key, r.setting_value]));
          publicKey = m2.vapid_public_key;
          privateKey = m2.vapid_private_key;
        }
      }

      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@bismillahchickencenter.com',
        publicKey,
        privateKey
      );
      return { publicKey, privateKey };
    })().catch((error) => {
      vapidReady = null; // retry next time
      throw error;
    });
  }
  return vapidReady;
};

// --------------------------------------------
// Firebase Cloud Messaging (HTTP v1) — no SDK, just a signed JWT.
// FCM_SERVICE_ACCOUNT can be the service-account JSON itself, the same
// JSON base64-encoded, or a path to the .json file.
// --------------------------------------------
let fcmAccount;
const getFcmAccount = () => {
  if (fcmAccount !== undefined) return fcmAccount;
  fcmAccount = null;
  const raw = (process.env.FCM_SERVICE_ACCOUNT || '').trim();
  if (!raw) return null;
  try {
    let text = raw;
    if (!raw.startsWith('{')) {
      text = fs.existsSync(raw) ? fs.readFileSync(raw, 'utf8') : Buffer.from(raw, 'base64').toString('utf8');
    }
    const json = JSON.parse(text);
    if (json.client_email && json.private_key && json.project_id) fcmAccount = json;
    else console.error('❌ FCM_SERVICE_ACCOUNT is missing client_email/private_key/project_id');
  } catch (error) {
    console.error('❌ FCM_SERVICE_ACCOUNT could not be read:', error.message);
  }
  return fcmAccount;
};

let fcmToken = { value: null, expires: 0 };
const getFcmAccessToken = async (account) => {
  if (fcmToken.value && Date.now() < fcmToken.expires) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), account.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`FCM auth failed: ${data.error || res.status}`);
  fcmToken = { value: data.access_token, expires: Date.now() + (data.expires_in - 120) * 1000 };
  return fcmToken.value;
};

const sendFcm = async (token, msg) => {
  const account = getFcmAccount();
  if (!account) return 'skipped';
  const accessToken = await getFcmAccessToken(account);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: msg.title, body: msg.body },
        data: { link: msg.link || '', type: msg.type || 'general' },
        android: {
          priority: 'HIGH',
          notification: { channel_id: 'bcc_alerts', color: '#A61B24', sound: 'default' },
        },
      },
    }),
  });
  if (res.ok) return 'sent';
  const err = await res.json().catch(() => ({}));
  const code = err?.error?.details?.find?.((d) => d.errorCode)?.errorCode || err?.error?.status;
  if (res.status === 404 || code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT') return 'gone';
  throw new Error(`FCM send failed: ${res.status} ${code || ''}`);
};

// --------------------------------------------
// Subscriptions
// --------------------------------------------
const hashOf = (s) => crypto.createHash('sha256').update(s).digest('hex');

const saveSubscription = async ({ userId, kind, endpoint, data, userAgent }) => {
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, kind, endpoint_hash, data, user_agent, last_used_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), kind = VALUES(kind), data = VALUES(data),
                             user_agent = VALUES(user_agent), last_used_at = NOW()`,
    [userId, kind, hashOf(endpoint), JSON.stringify(data), (userAgent || '').slice(0, 255)]
  );
};

const removeSubscription = async ({ userId, endpoint }) => {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND user_id = ?', [
    hashOf(endpoint),
    userId,
  ]);
};

// --------------------------------------------
// Delivery
// --------------------------------------------
const clip = (s, n) => String(s || '').slice(0, n);

const deliver = async (userIds, msg) => {
  const ids = [...new Set((userIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  if (ids.length === 0) return;

  const note = {
    title: clip(msg.title, 160),
    body: clip(msg.body, 500),
    link: msg.link ? clip(msg.link, 255) : null,
    type: clip(msg.type || 'general', 40),
  };

  await pool.query(
    'INSERT INTO notifications (user_id, type, title, body, link) VALUES ?',
    [ids.map((id) => [id, note.type, note.title, note.body, note.link])]
  );

  const [subs] = await pool.query(
    'SELECT id, kind, data FROM push_subscriptions WHERE user_id IN (?)',
    [ids]
  );
  if (subs.length === 0) return;

  const gone = [];
  const payload = JSON.stringify({ ...note, tag: `${note.type}-${Date.now()}` });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        const data = JSON.parse(sub.data);
        if (sub.kind === 'web') {
          await getVapidKeys();
          await webpush.sendNotification(data, payload, { TTL: 60 * 60 * 24, urgency: 'high' });
        } else if (sub.kind === 'fcm') {
          if ((await sendFcm(data.token, note)) === 'gone') gone.push(sub.id);
        }
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) gone.push(sub.id);
        else console.error(`❌ Push to subscription ${sub.id} failed:`, error.message);
      }
    })
  );

  if (gone.length) await pool.query('DELETE FROM push_subscriptions WHERE id IN (?)', [gone]);
};

// Fire-and-forget: runs after the current request has been answered.
const notify = (userIds, msg) => {
  setImmediate(() => {
    deliver(userIds, msg).catch((error) =>
      console.error('❌ Notification failed:', error.message)
    );
  });
};

// Same, but resolves the recipients first (they need a query).
const notifyWhen = (resolveUserIds, msg) => {
  setImmediate(async () => {
    try {
      const ids = await resolveUserIds();
      await deliver(ids, msg);
    } catch (error) {
      console.error('❌ Notification failed:', error.message);
    }
  });
};

// --------------------------------------------
// Recipient helpers
// --------------------------------------------
const adminUserIds = async () => {
  const [rows] = await pool.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
  return rows.map((r) => r.id);
};

const retailerUserIds = async (retailerIds) => {
  const ids = [].concat(retailerIds).filter(Boolean);
  if (!ids.length) return [];
  const [rows] = await pool.query('SELECT user_id FROM retailers WHERE id IN (?) AND user_id IS NOT NULL', [ids]);
  return rows.map((r) => r.user_id);
};

// Retailers that follow the global price (no custom price of their own).
const retailersOnGlobalPrice = async () => {
  const [rows] = await pool.query(
    `SELECT r.user_id FROM retailers r
       JOIN users u ON u.id = r.user_id AND u.status = 'active'
      WHERE r.id NOT IN (SELECT retailer_id FROM retailer_pricing)`
  );
  return rows.map((r) => r.user_id);
};

const inr = (n) =>
  `₹${(parseFloat(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

module.exports = {
  ensureNotificationTables,
  getVapidKeys,
  saveSubscription,
  removeSubscription,
  notify,
  notifyWhen,
  deliver,
  adminUserIds,
  retailerUserIds,
  retailersOnGlobalPrice,
  inr,
  isFcmConfigured: () => !!getFcmAccount(),
  IS_DEV,
};
