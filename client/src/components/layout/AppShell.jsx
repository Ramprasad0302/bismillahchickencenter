import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiMenu, FiX, FiLogOut, FiChevronDown, FiCalendar, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Logo from '../brand/Logo';
import BrandLoader from '../brand/BrandLoader';

const flatten = (groups) => groups.flatMap((g) => g.items);

const SidebarContent = ({ groups, portal, onNavigate, onLogout, displayName, role, navId }) => (
  <div className="relative h-full flex flex-col text-white overflow-hidden bg-gradient-to-b from-coal-2 via-coal to-[#0d0a08]">
    {/* Ambient glow + texture */}
    <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
    <div className="pointer-events-none absolute bottom-0 right-0 w-56 h-56 rounded-full bg-brand/15 blur-3xl" />
    <div className="pointer-events-none absolute inset-0 bg-pattern opacity-40" />

    {/* Brand */}
    <div className="relative flex-shrink-0 px-6 pt-6 pb-5">
      <div className="flex items-center gap-3.5">
        <Logo size={50} ring />
        <div className="min-w-0">
          <h2 className="font-brand text-[17px] font-bold tracking-[0.14em] text-gold-gradient leading-none">
            BISMILLAH
          </h2>
          <p className="mt-1.5 text-[9px] tracking-[0.32em] text-white/55 font-semibold">CHICKEN CENTER</p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent" />
        <span className="text-[9px] tracking-[0.3em] text-gold/80 font-semibold uppercase">{portal}</span>
        <span className="h-px flex-1 bg-gradient-to-l from-gold/60 to-transparent" />
      </div>
    </div>

    {/* Navigation */}
    <nav className="relative flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((group, gi) => (
        <div key={group.category || gi} className="mb-5">
          {group.category && (
            <p className="px-4 mb-2 text-[10px] font-semibold tracking-[0.25em] text-gold/45 uppercase">
              {group.category}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.path} to={item.path} onClick={onNavigate} className="block">
                {({ isActive }) => (
                  <div
                    className={`group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-white/55 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId={navId}
                        className="absolute inset-0 rounded-xl border border-gold/25"
                        style={{
                          background:
                            'linear-gradient(100deg, rgba(201,151,63,0.24) 0%, rgba(166,27,36,0.16) 60%, rgba(166,27,36,0.04) 100%)',
                        }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      >
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-gradient-to-b from-gold-light to-gold shadow-[0_0_12px_rgba(233,199,123,0.8)]" />
                      </motion.div>
                    )}
                    <span
                      className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-br from-gold-light to-gold-dark text-coal shadow-gold'
                          : 'bg-white/[0.04] text-white/60 group-hover:bg-white/10 group-hover:text-gold-light'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                    </span>
                    <span className="relative truncate transition-transform duration-200 group-hover:translate-x-0.5">
                      {item.label}
                    </span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>

    {/* User */}
    <div className="relative flex-shrink-0 p-4">
      <div className="gold-border rounded-2xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-coal flex items-center justify-center font-brand font-bold text-base">
          {displayName?.[0]?.toUpperCase() || 'B'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{displayName}</p>
          <p className="text-[11px] text-gold/80 capitalize tracking-wide">{role}</p>
        </div>
        <button
          onClick={onLogout}
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-brand/40 transition"
          title="Logout"
          aria-label="Logout"
        >
          <FiLogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

const AppShell = ({ groups, portal, profilePath, refreshProfile = false }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.name || portal);
  const menuRef = useRef(null);

  // Keep the shown name in sync with the server (admins can rename themselves
  // in Settings). Fire-and-forget: the cached name renders immediately.
  useEffect(() => {
    if (!refreshProfile) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => {
        const fresh = res.data?.data;
        if (cancelled || !res.data?.success || !fresh) return;
        if (fresh.name) setDisplayName(fresh.name);
        try {
          const saved = JSON.parse(localStorage.getItem('user') || 'null');
          if (saved) localStorage.setItem('user', JSON.stringify({ ...saved, name: fresh.name, phone: fresh.phone }));
        } catch {
          /* ignore corrupt cache */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshProfile, portal]);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const current = useMemo(() => {
    const items = flatten(groups);
    return (
      items.find((i) => location.pathname === i.path) ||
      items
        .filter((i) => location.pathname.startsWith(i.path + '/'))
        .sort((a, b) => b.path.length - a.path.length)[0]
    );
  }, [groups, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const sidebarProps = {
    groups,
    portal,
    displayName,
    role: user?.role || portal,
    onLogout: handleLogout,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-[272px] flex-shrink-0 shadow-[8px_0_30px_-12px_rgba(0,0,0,0.35)] z-20">
        <SidebarContent {...sidebarProps} navId="nav-active-desktop" />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-coal/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed top-0 left-0 z-50 w-[280px] h-full lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <button
                className="absolute top-4 right-3 z-10 p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <FiX className="w-5 h-5" />
              </button>
              <SidebarContent {...sidebarProps} navId="nav-active-mobile" onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-line px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gold-soft text-ink transition"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div className="lg:hidden">
                <Logo size={34} />
              </div>
              <div className="min-w-0">
                <p className="hidden sm:block text-[10px] font-semibold tracking-[0.25em] uppercase text-gold-dark">
                  {portal}
                </p>
                <AnimatePresence mode="wait">
                  <motion.h1
                    key={current?.label || 'page'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="font-display text-lg sm:text-xl font-semibold text-ink truncate"
                  >
                    {current?.label || 'Details'}
                  </motion.h1>
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-full bg-gold-soft border border-gold/20 text-xs font-medium text-gold-dark">
                <FiCalendar className="w-3.5 h-3.5" />
                {today}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-line bg-white hover:border-gold/50 hover:shadow-md transition"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-light to-brand-dark text-white flex items-center justify-center text-sm font-bold">
                    {displayName?.[0]?.toUpperCase() || 'B'}
                  </span>
                  <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium text-ink">{displayName}</span>
                  <FiChevronDown className={`w-4 h-4 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="absolute right-0 mt-2 w-60 origin-top-right bg-white rounded-2xl border border-line shadow-[var(--shadow-lift)] overflow-hidden z-50"
                    >
                      <div className="px-4 py-3.5 bg-gradient-to-br from-coal-2 to-coal text-white">
                        <p className="text-sm font-semibold truncate">{displayName}</p>
                        <p className="text-xs text-gold/90 capitalize">{user?.role || portal}</p>
                      </div>
                      <div className="py-1.5">
                        {profilePath && (
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              navigate(profilePath);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink hover:bg-gold-soft transition"
                          >
                            <FiUser className="w-4 h-4 text-gold-dark" />
                            {profilePath.includes('settings') ? 'Settings' : 'My Profile'}
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-danger hover:bg-danger-soft transition"
                        >
                          <FiLogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-gold-soft/70 to-transparent" />
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative p-4 sm:p-6 lg:p-8"
          >
            <Suspense fallback={<BrandLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;
