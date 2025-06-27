// src/app/components/ui/Button.tsx - Updated with theme colors
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { ButtonProps } from '@/app/types/staff';

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary-900 hover:bg-primary-700 text-white focus:ring-primary-500 shadow-soft hover:shadow-medium',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-500 shadow-soft hover:shadow-medium',
    outline: 'border-2 border-primary-900 text-primary-900 hover:bg-primary-900 hover:text-white focus:ring-primary-500 bg-transparent',
    ghost: 'text-primary-900 hover:bg-primary-50 focus:ring-primary-500',
    danger: 'bg-error-500 hover:bg-error-600 text-white focus:ring-error-500 shadow-soft hover:shadow-medium',
    success: 'bg-success-500 hover:bg-success-600 text-white focus:ring-success-500 shadow-soft hover:shadow-medium',
    warning: 'bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500 shadow-soft hover:shadow-medium',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </button>
  );
};

export default Button;