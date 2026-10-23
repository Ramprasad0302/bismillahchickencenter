import { motion } from 'framer-motion';

// Categorical order validated for colour-blind separation and contrast on a
// light surface (crimson, gold, blue, green). Assigned in this fixed order.
export const CAT = ['#b3262f', '#b5842a', '#2a6fbf', '#2f9e5a'];

export const inr = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// Indian short form for big headline numbers: ₹98.50 L, ₹1.25 Cr.
export const inrCompact = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
};

export const inrShort = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n || 0)}`;
};

export const axisProps = {
  tick: { fill: '#85796d', fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

export const ChartCard = ({ title, subtitle, action, children, className = '', delay = 0 }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`bg-white rounded-2xl border border-line p-5 sm:p-6 ${className}`}
  >
    <div className="flex items-start justify-between gap-3 mb-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </motion.section>
);

export const Legend = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
    {items.map((it) => (
      <span key={it.label} className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: it.color }} />
        {it.label}
      </span>
    ))}
  </div>
);

// Tooltip body shared by every chart: values in ink, colour only on the key.
export const ChartTooltip = ({ active, payload, label, labelFormat, valueFormat = inr }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gold/30 bg-coal/95 px-3.5 py-2.5 shadow-xl backdrop-blur text-white min-w-[150px]">
      {label !== undefined && (
        <p className="text-[11px] tracking-wide text-gold-light mb-1.5">{labelFormat ? labelFormat(label) : label}</p>
      )}
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <span className="inline-flex items-center gap-1.5 text-white/70">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span className="font-semibold">{valueFormat(p.value, p)}</span>
        </div>
      ))}
    </div>
  );
};
