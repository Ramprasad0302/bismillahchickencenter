const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: Icon,
  iconPosition = 'left',
  ...props 
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg cursor-pointer';
  
  const variants = {
    primary: 'bg-[#111714] text-white hover:bg-[#29312d]',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    outline: 'border-2 border-[#111714] text-[#111714] hover:bg-[#111714] hover:text-white',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 mr-2" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 ml-2" />}
    </button>
  );
};

export default Button;