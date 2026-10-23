const pool = require('../config/db');
const notifications = require('../services/notificationService');

// GET /api/notifications — latest alerts for the signed-in user + unread count
exports.list = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const [items] = await pool.query(
      `SELECT id, type, title, body, link, read_at, created_at
         FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC, id DESC LIMIT ?`,
      [req.user.id, limit]
    );
    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    res.json({ success: true, data: { items, unread: Number(unread) } });
  } catch (error) {
    console.error('❌ Error listing notifications:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

// POST /api/notifications/read  { ids: [1,2] }  or  { all: true }
exports.markRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
    if (req.body?.all === true) {
      await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
    } else if (ids.length) {
      await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND id IN (?) AND read_at IS NULL', [
        req.user.id,
        ids.slice(0, 200),
      ]);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking notifications read:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};

// GET /api/notifications/vapid-public-key — browsers need it to subscribe
exports.vapidPublicKey = async (req, res) => {
  try {
    const { publicKey } = await notifications.getVapidKeys();
    res.json({ success: true, data: { publicKey } });
  } catch (error) {
    console.error('❌ Error loading VAPID key:', error.message);
    res.status(500).json({ success: false, message: 'Push notifications are unavailable' });
  }
};

// POST /api/notifications/subscribe
//   web:  { kind: 'web', subscription: { endpoint, keys: { p256dh, auth } } }
//   app:  { kind: 'fcm', token: '<FCM registration token>' }
exports.subscribe = async (req, res) => {
  try {
    const { kind } = req.body || {};
    const userAgent = req.get('user-agent');
    if (kind === 'web') {
      const sub = req.body.subscription;
      const ok =
        sub && typeof sub.endpoint === 'string' && /^https:\/\//.test(sub.endpoint) &&
        sub.endpoint.length < 1000 && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string';
      if (!ok) return res.status(400).json({ success: false, message: 'Invalid subscription' });
      await notifications.saveSubscription({
        userId: req.user.id,
        kind: 'web',
        endpoint: sub.endpoint,
        data: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        userAgent,
      });
    } else if (kind === 'fcm') {
      const token = req.body.token;
      if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
        return res.status(400).json({ success: false, message: 'Invalid token' });
      }
      await notifications.saveSubscription({ userId: req.user.id, kind: 'fcm', endpoint: token, data: { token }, userAgent });
    } else {
      return res.status(400).json({ success: false, message: 'Unknown subscription kind' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving push subscription:', error.message);
    res.status(500).json({ success: false, message: 'Failed to enable notifications' });
  }
};

// POST /api/notifications/unsubscribe  { endpoint } or { token }
exports.unsubscribe = async (req, res) => {
  try {
    const endpoint = req.body?.endpoint || req.body?.token;
    if (typeof endpoint === 'string' && endpoint) {
      await notifications.removeSubscription({ userId: req.user.id, endpoint });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error removing push subscription:', error.message);
    res.status(500).json({ success: false, message: 'Failed to disable notifications' });
  }
};

// POST /api/notifications/test — sends a test alert to yourself
exports.test = async (req, res) => {
  try {
    await notifications.deliver([req.user.id], {
      title: 'Notifications are working ✅',
      body: 'You will get alerts for orders, prices, deliveries and payments here.',
      type: 'test',
    });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error sending test notification:', error.message);
    res.status(500).json({ success: false, message: 'Failed to send test notification' });
  }
};
