const variants = {
  default: 'bg-gray-100 text-gray-700 ring-gray-200',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-gold-soft text-gold-dark ring-gold/30',
  danger: 'bg-danger-soft text-danger ring-danger/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  primary: 'bg-brand text-white ring-brand/30',
};

const dots = {
  default: 'bg-gray-400',
  success: 'bg-success',
  warning: 'bg-gold',
  danger: 'bg-danger',
  info: 'bg-sky-500',
  primary: 'bg-white',
};

const Badge = ({ children, variant = 'default', className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset ${
      variants[variant] || variants.default
    } ${className}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${dots[variant] || dots.default}`} />
    {children}
  </span>
);

export default Badge;
