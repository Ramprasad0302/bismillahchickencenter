import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiBell,
  FiTag,
  FiShoppingBag,
  FiTruck,
  FiCheckCircle,
  FiCreditCard,
  FiMap,
  FiInfo,
  FiBellOff,
} from 'react-icons/fi';
import api from '../../services/api';
import { enablePush, pushPermission, pushSupported } from '../../services/pushNotifications';

const POLL_MS = 30 * 1000;

const ICONS = {
  price: { icon: FiTag, tone: 'bg-gold-soft text-gold-dark' },
  order: { icon: FiShoppingBag, tone: 'bg-brand-soft text-brand' },
  order_status: { icon: FiShoppingBag, tone: 'bg-brand-soft text-brand' },
  trip_assigned: { icon: FiMap, tone: 'bg-sky-50 text-sky-700' },
  out_for_delivery: { icon: FiTruck, tone: 'bg-sky-50 text-sky-700' },
  delivered: { icon: FiCheckCircle, tone: 'bg-success-soft text-success' },
  trip_completed: { icon: FiCheckCircle, tone: 'bg-success-soft text-success' },
  payment: { icon: FiCreditCard, tone: 'bg-success-soft text-success' },
};

const timeAgo = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [permission, setPermission] = useState('default');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const ref = useRef(null);
  const lastUnread = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications', { params: { limit: 25, t: Date.now() } });
      const data = res.data?.data;
      if (!data) return;
      setItems(data.items);
      setUnread(data.unread);
      lastUnread.current = data.unread;
    } catch {
      /* offline or logged out — try again next tick */
    }
  }, []);

  useEffect(() => {
    load();
    pushPermission().then(setPermission);
    const tick = () => document.visibilityState === 'visible' && load();
    const timer = setInterval(tick, POLL_MS);
    const onPing = () => load();
    window.addEventListener('bcc-notification', onPing);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('bcc-notification', onPing);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const markAllRead = async () => {
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnread(0);
    try {
      await api.post('/notifications/read', { all: true });
    } catch {
      load();
    }
  };

  const openItem = async (n) => {
    setOpen(false);
    if (!n.read_at) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      api.post('/notifications/read', { ids: [n.id] }).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const turnOn = async () => {
    setBusy(true);
    setNotice('');
    try {
      const result = await enablePush();
      setPermission(result === 'granted' ? 'granted' : result);
      if (result === 'granted') setNotice('Alerts are on for this device.');
      else if (result === 'denied') setNotice('Alerts are blocked. Allow notifications for this site in your settings.');
    } catch {
      setNotice('Could not turn on alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    try {
      await api.post('/notifications/test');
      setTimeout(load, 800);
    } catch {
      setNotice('Could not send a test alert.');
    }
  };

  const canEnable = pushSupported() && permission !== 'granted' && permission !== 'unsupported';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-full border border-line bg-white flex items-center justify-center text-ink hover:border-gold/50 hover:shadow-md transition"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
      >
        <motion.span
          key={unread}
          animate={unread ? { rotate: [0, -14, 12, -8, 6, 0] } : {}}
          transition={{ duration: 0.6 }}
          className="flex"
        >
          <FiBell className="w-[18px] h-[18px]" />
        </motion.span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 sm:w-[380px] origin-top-right bg-white rounded-2xl border border-line shadow-[var(--shadow-lift)] overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-coal-2 to-coal text-white">
              <div>
                <p className="text-sm font-semibold">Notifications</p>
                <p className="text-[11px] text-gold/90">{unread ? `${unread} unread` : 'All caught up'}</p>
              </div>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs font-semibold text-gold-light hover:text-white transition">
                  Mark all read
                </button>
              )}
            </div>

            {canEnable && (
              <div className="px-4 py-3 bg-gold-soft border-b border-gold/20 flex items-center gap-3">
                <FiBell className="w-5 h-5 text-gold-dark shrink-0" />
                <p className="text-xs text-ink flex-1">Get alerts even when the app is closed.</p>
                <button
                  onClick={turnOn}
                  disabled={busy}
                  className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold disabled:opacity-60"
                >
                  {busy ? 'Turning on…' : 'Turn on'}
                </button>
              </div>
            )}
            {permission === 'denied' && (
              <div className="px-4 py-2.5 bg-danger-soft border-b border-danger/15 flex items-center gap-2 text-xs text-danger">
                <FiBellOff className="w-4 h-4 shrink-0" />
                Alerts are blocked. Allow notifications for this app in your phone or browser settings.
              </div>
            )}
            {notice && <div className="px-4 py-2 text-xs text-muted border-b border-line">{notice}</div>}

            <div className="max-h-[60vh] sm:max-h-[420px] overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-gold-soft flex items-center justify-center">
                    <FiBell className="w-5 h-5 text-gold-dark" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">No notifications yet</p>
                  <p className="text-xs text-muted">Orders, prices and deliveries will show up here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((n) => {
                    const meta = ICONS[n.type] || { icon: FiInfo, tone: 'bg-gray-100 text-gray-600' };
                    const Icon = meta.icon;
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => openItem(n)}
                          className={`w-full text-left flex gap-3 px-4 py-3 transition hover:bg-gold-soft/60 ${n.read_at ? '' : 'bg-brand-soft/40'}`}
                        >
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-start justify-between gap-2">
                              <span className={`text-sm ${n.read_at ? 'text-ink' : 'text-ink font-semibold'}`}>{n.title}</span>
                              {!n.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-brand shrink-0" />}
                            </span>
                            {n.body && <span className="block text-xs text-muted mt-0.5 leading-5">{n.body}</span>}
                            <span className="block text-[11px] text-muted-light mt-1">{timeAgo(n.created_at)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-line bg-cream/60 flex justify-between items-center">
              <span className="text-[11px] text-muted">Updates every 30 seconds</span>
              <button onClick={sendTest} className="text-[11px] font-semibold text-brand hover:text-brand-dark">
                Send test alert
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
