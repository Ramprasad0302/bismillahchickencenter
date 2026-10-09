const baseStyles =
  'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]';

const variants = {
  primary: 'bg-brand text-white',
  secondary: 'bg-gold-soft text-gold-dark border border-gold/25 hover:bg-gold/15 hover:border-gold/40',
  gold: 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-coal shadow-gold hover:brightness-105',
  outline: 'border border-brand/70 text-brand bg-white hover:bg-brand hover:text-white hover:border-brand',
  danger: 'bg-danger text-white hover:bg-danger-dark shadow-[0_8px_20px_-10px_rgba(192,53,43,0.7)]',
  ghost: 'text-muted hover:text-ink hover:bg-gold-soft',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconPosition = 'left',
  ...props
}) => (
  <button className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`} {...props}>
    {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 mr-2" />}
    {children}
    {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 ml-2" />}
  </button>
);

export default Button;
