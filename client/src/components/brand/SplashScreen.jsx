import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

const TITLE = 'BISMILLAH';
const DURATION_MS = 2900;

// Opening animation shown when the app starts: gold rings draw themselves
// around the logo, the badge rises out of a blur with a light sweep, the
// name writes in letter by letter, then the whole stage lifts away.
const SplashScreen = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, DURATION_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  // Fixed pseudo-random embers so the layout is stable between renders.
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: (i * 37) % 100,
        size: 2 + ((i * 7) % 4),
        delay: (i % 7) * 0.35,
        duration: 3.5 + ((i * 3) % 4),
      })),
    []
  );

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(circle at 50% 42%, #33281f 0%, #1a1511 45%, #0d0a08 100%)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(6px)' }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
      onClick={onDone}
      role="presentation"
    >
      {/* Rising gold embers */}
      {embers.map((e, i) => (
        <motion.span
          key={i}
          className="absolute bottom-[-10px] rounded-full bg-gold-light"
          style={{ left: `${e.left}%`, width: e.size, height: e.size, boxShadow: '0 0 8px #e9c77b' }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: '-105vh', opacity: [0, 0.9, 0] }}
          transition={{ duration: e.duration, delay: e.delay, ease: 'easeOut', repeat: Infinity }}
        />
      ))}

      {/* Soft spotlight */}
      <motion.div
        className="absolute w-[520px] h-[520px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(201,151,63,0.28), transparent 65%)' }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: 'easeOut' }}
      />

      <div className="relative flex flex-col items-center">
        <div className="relative w-[230px] h-[230px] sm:w-[260px] sm:h-[260px]">
          {/* Rings drawing themselves */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 260 260">
            <defs>
              <linearGradient id="sp-gold" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f4dc9f" />
                <stop offset="50%" stopColor="#c9973f" />
                <stop offset="100%" stopColor="#8a6322" />
              </linearGradient>
            </defs>
            <motion.circle
              cx="130" cy="130" r="126" fill="none" stroke="url(#sp-gold)" strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.3, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.circle
              cx="130" cy="130" r="116" fill="none" stroke="#c9973f" strokeOpacity="0.45" strokeWidth="1"
              strokeDasharray="2 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: 0.2, ease: 'easeInOut' }}
            />
          </svg>
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
          >
            <span className="absolute left-1/2 -top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-gold-light shadow-[0_0_14px_4px_rgba(233,199,123,0.7)]" />
          </motion.div>

          {/* The badge */}
          <motion.div
            className="absolute inset-[22px] rounded-full overflow-hidden shine"
            style={{ boxShadow: '0 0 70px rgba(201,151,63,0.45), 0 25px 60px rgba(0,0,0,0.6)' }}
            initial={{ scale: 0.55, opacity: 0, filter: 'blur(14px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <img src="/logo.png" alt="Bismillah Chicken Center" className="w-full h-full object-cover" draggable={false} />
          </motion.div>
        </div>

        {/* Name */}
        <div className="mt-9 flex overflow-hidden" aria-label={TITLE}>
          {TITLE.split('').map((ch, i) => (
            <motion.span
              key={i}
              className="font-brand text-4xl sm:text-5xl font-bold tracking-[0.18em] text-gold-gradient"
              initial={{ y: '110%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.div
          className="mt-3 flex items-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.55 }}
        >
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold" />
          <span className="text-[11px] sm:text-xs tracking-[0.45em] text-[#f1e3c4]/80 font-semibold">
            CHICKEN CENTER
          </span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold" />
        </motion.div>
        <motion.p
          className="mt-2 text-[10px] tracking-[0.5em] text-brand-light font-semibold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.8 }}
        >
          BHIMAVARAM
        </motion.p>

        {/* Progress */}
        <div className="mt-10 h-[2px] w-44 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-gold-dark via-gold-light to-gold"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: DURATION_MS / 1000 - 0.3, ease: [0.65, 0, 0.35, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
