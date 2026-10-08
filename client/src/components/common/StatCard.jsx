import { motion } from 'framer-motion';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import AnimatedNumber from './AnimatedNumber';

const accents = {
  brand: { tile: 'from-brand-light to-brand-dark text-white', glow: 'bg-brand/10', bar: 'from-brand to-brand-light' },
  gold: { tile: 'from-gold-light to-gold-dark text-coal', glow: 'bg-gold/15', bar: 'from-gold-dark to-gold-light' },
  success: { tile: 'from-emerald-500 to-success-dark text-white', glow: 'bg-success/10', bar: 'from-success to-emerald-400' },
  coal: { tile: 'from-coal-3 to-coal text-gold-light', glow: 'bg-coal/10', bar: 'from-coal to-coal-3' },
};

// KPI tile. Pass a number as `value` (with `format`) to get a count-up
// animation, or any string/node to show it as-is.
const StatCard = ({
  title,
  value,
  format,
  icon: Icon,
  subtitle,
  change,
  changeType = 'increase',
  accent = 'gold',
  delay = 0,
  className = '',
}) => {
  const a = accents[accent] || accents.gold;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)] transition-shadow duration-300 ${className}`}
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 w-32 h-32 rounded-full blur-2xl ${a.glow} transition-transform duration-500 group-hover:scale-150`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
          <p className="mt-2.5 text-[26px] sm:text-[28px] leading-none font-bold text-ink tracking-tight truncate">
            {typeof value === 'number' ? <AnimatedNumber value={value} format={format} /> : value}
          </p>
          {subtitle && <p className="mt-2 text-xs text-muted truncate">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${a.tile} flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {change && (
        <div className="relative mt-3 flex items-center gap-2">
          <span className={`text-xs font-semibold ${changeType === 'increase' ? 'text-success' : 'text-danger'}`}>
            {changeType === 'increase' ? (
              <FiArrowUp className="inline w-3 h-3 mr-1" />
            ) : (
              <FiArrowDown className="inline w-3 h-3 mr-1" />
            )}
            {change}
          </span>
        </div>
      )}
      <div className={`absolute bottom-0 left-0 h-[3px] w-0 bg-gradient-to-r ${a.bar} transition-all duration-500 group-hover:w-full`} />
    </motion.div>
  );
};

export default StatCard;
