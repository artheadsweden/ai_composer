import React from 'react';
import { Loader } from 'lucide-react';

/**
 * Button component with various styles and states
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  // Style variations
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300',
    outline: 'bg-transparent border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
  };

  // Size variations
  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };

  // Determine disabled style
  const disabledStyle = disabled || loading 
    ? 'opacity-60 cursor-not-allowed' 
    : '';

  // Combine classes
  const buttonClass = `
    rounded font-medium transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
    ${variants[variant] || variants.primary}
    ${sizes[size] || sizes.md}
    ${disabledStyle}
    ${className}
  `;

  // Handle click event
  const handleClick = (e) => {
    if (disabled || loading) return;
    if (onClick) onClick(e);
  };

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader size={size === 'sm' ? 14 : size === 'lg' ? 22 : 18} className="animate-spin mr-2" />
          {children}
        </div>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="mr-2">{icon}</span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="ml-2">{icon}</span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;