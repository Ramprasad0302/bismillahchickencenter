import { motion } from 'framer-motion';

// Page-level loading state: the logo breathing inside a spinning gold ring.
const BrandLoader = ({ label = 'Loading', fullScreen = false }) => (
  <div
    className={`flex flex-col items-center justify-center gap-5 ${
      fullScreen ? 'min-h-screen bg-cream' : 'py-24'
    }`}
    role="status"
    aria-live="polite"
  >
    <div className="relative w-20 h-20">
      <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '1.4s' }} viewBox="0 0 80 80">
        <defs>
          <linearGradient id="bl-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f4dc9f" />
            <stop offset="55%" stopColor="#c9973f" />
            <stop offset="100%" stopColor="#9a7128" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="37" fill="none" stroke="#ece3d4" strokeWidth="2" />
        <circle cx="40" cy="40" r="37" fill="none" stroke="url(#bl-gold)" strokeWidth="3" strokeLinecap="round" strokeDasharray="150 240" />
      </svg>
      <motion.img
        src="/logo.png"
        alt=""
        className="absolute inset-[9px] rounded-full object-cover shadow-lg"
        style={{ width: 62, height: 62 }}
        animate={{ scale: [0.94, 1, 0.94] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
    <div className="flex items-center gap-1 text-xs font-semibold tracking-[0.3em] uppercase text-gold-dark">
      {label}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        >
          .
        </motion.span>
      ))}
    </div>
  </div>
);

export default BrandLoader;
