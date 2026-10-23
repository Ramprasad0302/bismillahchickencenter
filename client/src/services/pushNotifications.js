import { Capacitor } from '@capacitor/core';
import api from './api';

// ============================================
// Push notifications for the website (Web Push + service worker) and the
// Android app (Firebase Cloud Messaging through Capacitor).
//
// enablePush()  — asks permission (must run from a tap/click) and registers
//                 this device for the signed-in user.
// resumePush()  — on app start/login: if permission was already given,
//                 silently re-registers so the device follows the current user.
// disablePush() — on logout: unregisters this device so the next person who
//                 signs in on it doesn't get the previous user's alerts.
// ============================================

const isNative = Capacitor.isNativePlatform();
// Set at build time when android/app/google-services.json exists. Without
// Firebase configured, registering would crash the app, so it is skipped.
const nativePushAvailable = isNative && import.meta.env.VITE_ANDROID_PUSH === '1';

const STORE_KEY = 'bcc_push_endpoint';

const remember = (endpoint) => {
  try {
    localStorage.setItem(STORE_KEY, endpoint);
  } catch {
    /* ignore */
  }
};
const recall = () => {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
};

const urlBase64ToUint8Array = (base64) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const pushSupported = () =>
  nativePushAvailable ||
  (!isNative && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);

// 'granted' | 'denied' | 'default' | 'unsupported'
export const pushPermission = async () => {
  if (!pushSupported()) return 'unsupported';
  if (nativePushAvailable) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { receive } = await PushNotifications.checkPermissions();
    return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'default';
  }
  return Notification.permission;
};

// ---------- Web ----------
const registerWorker = () => navigator.serviceWorker.register('/sw.js', { scope: '/' });

const subscribeWeb = async () => {
  const registration = await registerWorker();
  await navigator.serviceWorker.ready;
  const { data } = await api.get('/notifications/vapid-public-key');
  const key = data?.data?.publicKey;
  if (!key) throw new Error('Push key unavailable');

  let sub = await registration.pushManager.getSubscription();
  // A subscription made with a different server key can't be reused.
  if (sub) {
    const current = sub.options?.applicationServerKey;
    const wanted = urlBase64ToUint8Array(key);
    const same = current && new Uint8Array(current).every((b, i) => b === wanted[i]) && new Uint8Array(current).length === wanted.length;
    if (!same) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  const json = sub.toJSON();
  await api.post('/notifications/subscribe', { kind: 'web', subscription: json });
  remember(json.endpoint);
};

// ---------- Android ----------
let nativeListenersAdded = false;
let onNativeTap = null;

const subscribeNative = async () => {
  const { PushNotifications } = await import('@capacitor/push-notifications');

  if (!nativeListenersAdded) {
    nativeListenersAdded = true;
    await PushNotifications.createChannel({
      id: 'bcc_alerts',
      name: 'Orders & deliveries',
      description: 'Orders, price changes, deliveries and payments',
      importance: 5,
      visibility: 1,
      vibration: true,
    }).catch(() => {});

    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        await api.post('/notifications/subscribe', { kind: 'fcm', token: value });
        remember(value);
      } catch {
        /* retried on next launch */
      }
    });
    await PushNotifications.addListener('pushNotificationReceived', () => {
      window.dispatchEvent(new Event('bcc-notification'));
    });
    await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
      const link = notification?.data?.link;
      if (link && onNativeTap) onNativeTap(link);
    });
  }
  await PushNotifications.register();
};

// ---------- Public API ----------
export const setNotificationTapHandler = (fn) => {
  onNativeTap = fn;
};

export const enablePush = async () => {
  if (!pushSupported()) return 'unsupported';
  if (nativePushAvailable) {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { receive } = await PushNotifications.requestPermissions();
    if (receive !== 'granted') return receive;
    await subscribeNative();
    return 'granted';
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  await subscribeWeb();
  return 'granted';
};

export const resumePush = async () => {
  try {
    if ((await pushPermission()) !== 'granted') return;
    if (nativePushAvailable) await subscribeNative();
    else await subscribeWeb();
  } catch {
    /* best effort */
  }
};

export const disablePush = async () => {
  const endpoint = recall();
  try {
    if (endpoint) await api.post('/notifications/unsubscribe', { endpoint });
  } catch {
    /* token may already be gone */
  }
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
};

// Web: keep the service worker registered so a tap on an alert can open
// the site, and listen for "new alert" pings from it.
export const initPushListeners = () => {
  if (!isNative && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'bcc-notification') window.dispatchEvent(new Event('bcc-notification'));
    });
  }
};
