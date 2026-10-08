import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Logo from "../components/brand/Logo";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiLoader,
} from "react-icons/fi";

const HOME = {
  admin: "/admin/dashboard",
  retailer: "/retailer/dashboard",
  driver: "/driver/dashboard",
};

const Login = () => {
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // API URL from environment or fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!phone || !password) {
      setError("Please enter your phone number and password.");
      return;
    }
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, { phone, password });

      if (response.data.success) {
        const userData = response.data.data;
        const token = response.data.token;

        if (token) localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userData));

        login({
          id: userData.id,
          phone: userData.phone,
          role: userData.role,
          name: userData.name,
          email: userData.email,
          token,
        });

        navigate(HOME[userData.role] || "/login", { replace: true });
      } else {
        setError(response.data.message || "Invalid phone number or password.");
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data?.message || "Invalid phone number or password.");
      } else if (error.request) {
        setError("Server is not responding. Please try again later.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Already signed in (e.g. opened /login from a bookmark): go straight in.
  if (isAuthenticated && HOME[user?.role]) {
    return <Navigate to={HOME[user.role]} replace />;
  }

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* LEFT — brand stage */}
      <section className="relative hidden min-h-screen overflow-hidden bg-gradient-to-br from-coal-3 via-coal-2 to-[#0b0907] p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="pointer-events-none absolute inset-0 bg-pattern opacity-30" />
        <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-brand/25 blur-3xl" />
        <motion.div
          className="pointer-events-none absolute -bottom-52 -right-52 h-[520px] w-[520px] rounded-full border border-gold/15"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute left-1/2 -top-1.5 h-3 w-3 -translate-x-1/2 rounded-full bg-gold-light shadow-[0_0_16px_4px_rgba(233,199,123,0.6)]" />
        </motion.div>
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[360px] w-[360px] rounded-full border border-white/5" />

        <motion.div
          className="relative z-10 flex items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Logo size={52} ring />
          <div>
            <h2 className="font-brand text-lg font-bold tracking-[0.16em] text-gold-gradient leading-none">BISMILLAH</h2>
            <p className="mt-1.5 text-[9px] tracking-[0.35em] text-white/50 font-semibold">CHICKEN CENTER · BHIMAVARAM</p>
          </div>
        </motion.div>

        <div className="relative z-10 my-auto flex items-center gap-10">
          <div className="max-w-xl">
            <motion.p
              className="mb-6 text-[11px] font-semibold tracking-[0.35em] text-gold/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              WHOLESALE POULTRY MANAGEMENT
            </motion.p>
            <motion.h1
              className="font-display text-6xl font-semibold leading-[1.02] xl:text-7xl"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              Fresh. Hygienic.
              <br />
              <span className="text-gold-gradient">Perfectly managed.</span>
            </motion.h1>
            <motion.p
              className="mt-8 max-w-md text-sm leading-7 text-white/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              Retailers, orders, deliveries, payments and your daily poultry operations —
              all in one elegant platform.
            </motion.p>
            <motion.div
              className="mt-10 flex gap-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {[
                ["Orders", "Live tracking"],
                ["Ledgers", "Every rupee"],
                ["Trips", "Driver to door"],
              ].map(([t, d]) => (
                <div key={t} className="border-l border-gold/40 pl-4">
                  <p className="text-sm font-semibold text-white">{t}</p>
                  <p className="text-xs text-white/45">{d}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        <motion.img
          src="/logo.png"
          alt=""
          className="pointer-events-none absolute right-12 top-1/2 hidden w-56 -translate-y-1/2 rounded-full opacity-90 shadow-[0_0_80px_rgba(201,151,63,0.35)] 2xl:block"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.9, scale: 1, y: [0, -10, 0] }}
          transition={{ opacity: { duration: 1 }, scale: { duration: 1 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        />

        <div className="relative z-10 text-[9px] tracking-[0.35em] text-white/30">
          © {new Date().getFullYear()} BISMILLAH CHICKEN CENTER · PROPRIETOR SAIDU
        </div>
      </section>

      {/* RIGHT — sign in */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10 sm:px-10 lg:px-14">
        <div className="pointer-events-none absolute inset-0 bg-pattern opacity-60" />
        <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

        <motion.div
          className="relative w-full max-w-[430px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-10 flex flex-col items-center text-center lg:hidden">
            <Logo size={110} ring />
            <h2 className="mt-4 font-brand text-2xl font-bold tracking-[0.16em] text-ink">BISMILLAH</h2>
            <p className="mt-1 text-[10px] tracking-[0.35em] text-gold-dark font-semibold">CHICKEN CENTER</p>
          </div>

          <div className="rounded-3xl border border-line bg-white/90 p-7 shadow-[var(--shadow-lift)] backdrop-blur sm:p-9">
            <div className="mb-8">
              <p className="text-[10px] font-semibold tracking-[0.3em] text-gold-dark">WELCOME BACK</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ink">Sign in to your account</h2>
              <p className="mt-2 text-sm text-muted">Enter your credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold text-ink">Phone Number</label>
                <div className="flex h-14 items-center rounded-xl border border-line bg-white px-4 transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/15">
                  <FiPhone className="mr-3 text-lg text-gold-dark" />
                  <span className="mr-3 border-r border-line pr-3 text-sm font-medium text-muted">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter phone number"
                    className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-light"
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-ink">Password</label>
                <div className="flex h-14 items-center rounded-xl border border-line bg-white px-4 transition focus-within:border-gold focus-within:ring-4 focus-within:ring-gold/15">
                  <FiLock className="mr-3 text-lg text-gold-dark" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-full w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted-light"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-3 cursor-pointer text-lg text-muted-light transition hover:text-ink"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto", x: [0, -6, 6, -4, 4, 0] }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="overflow-hidden rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-xs font-medium text-danger"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="group shine flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-brand text-[12px] font-semibold tracking-[0.22em] text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <FiLoader className="animate-spin" />
                    SIGNING IN...
                  </>
                ) : (
                  <>
                    SIGN IN
                    <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[10px] tracking-[0.25em] text-muted-light">FRESH · HYGIENIC</span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <p className="mt-4 text-center text-[11px] leading-5 text-muted">
              Having trouble signing in? Contact your administrator.
            </p>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-4 rounded-xl border border-line bg-white/70 p-3">
              <p className="text-xs font-semibold text-ink">Debug Info:</p>
              <p className="text-xs text-muted">API URL: {API_URL}</p>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default Login;
