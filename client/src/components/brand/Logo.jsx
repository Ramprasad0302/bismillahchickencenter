import { motion } from 'framer-motion';

// The circular brand badge. `ring` adds the rotating gold halo used in the
// sidebar and on the login screen.
const Logo = ({ size = 44, ring = false, className = '' }) => (
  <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
    {ring && (
      <motion.div
        aria-hidden
        className="absolute -inset-[3px] rounded-full"
        style={{
          background:
            'conic-gradient(from 0deg, #e9c77b, #9a7128, #f4dc9f, #c9973f, #7a5a1f, #e9c77b)',
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
      />
    )}
    <img
      src="/logo.png"
      alt="Bismillah Chicken Center"
      width={size}
      height={size}
      draggable={false}
      className="relative w-full h-full rounded-full object-cover bg-coal select-none"
    />
  </div>
);

export default Logo;
