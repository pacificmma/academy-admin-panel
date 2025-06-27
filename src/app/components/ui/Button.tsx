// src/app/components/ui/Button.tsx - Updated with sharp design
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
  const baseClasses = 'inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed border-2 tracking-wide';

  const variantClasses = {
    primary: 'bg-primary-900 hover:bg-primary-800 text-white focus:ring-primary-500 border-primary-900 hover:border-primary-800 shadow-sharp hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-500 border-secondary-500 hover:border-secondary-600 shadow-sharp hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0',
    outline: 'border-primary-900 text-primary-900 hover:bg-primary-900 hover:text-white focus:ring-primary-500 bg-background-paper shadow-soft hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0',
    ghost: 'text-primary-900 hover:bg-primary-50 focus:ring-primary-500 border-transparent hover:border-primary-100 shadow-none hover:shadow-soft',
    danger: 'bg-error-600 hover:bg-error-700 text-white focus:ring-error-500 border-error-600 hover:border-error-700 shadow-sharp hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0',
    success: 'bg-success-600 hover:bg-success-700 text-white focus:ring-success-500 border-success-600 hover:border-success-700 shadow-sharp hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0',
    warning: 'bg-warning-600 hover:bg-warning-700 text-white focus:ring-warning-500 border-warning-600 hover:border-warning-700 shadow-sharp hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm rounded-sm min-h-[32px]',
    md: 'px-4 py-2.5 text-sm rounded min-h-[40px]',
    lg: 'px-6 py-3 text-base rounded-md min-h-[48px]',
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