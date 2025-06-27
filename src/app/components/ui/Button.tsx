// src/app/components/ui/Button.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { ButtonProps } from '@/app/types';


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
  const getButtonClasses = () => {
    const baseClasses = 'font-medium rounded-lg text-sm focus:ring-4 focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center';
    
    const variantClasses = {
      primary: 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800',
      secondary: 'text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700',
      success: 'text-white bg-green-700 hover:bg-green-800 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800',
      danger: 'text-white bg-red-700 hover:bg-red-800 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900',
      warning: 'text-white bg-yellow-400 hover:bg-yellow-500 focus:ring-yellow-300 dark:focus:ring-yellow-900',
      outline: 'text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-blue-300 dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-500 dark:focus:ring-blue-800',
      ghost: 'text-blue-700 hover:bg-blue-50 focus:ring-blue-300 dark:text-blue-500 dark:hover:bg-blue-900/20 dark:focus:ring-blue-800',
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-5 py-3 text-base',
    };

    return cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    );
  };

  // Override primary variant to use Pacific MMA colors
  const getPrimaryStyle = () => {
    if (variant === 'primary') {
      return {
        backgroundColor: disabled || loading ? '#9ca3af' : '#004D61',
        borderColor: disabled || loading ? '#9ca3af' : '#004D61',
      };
    }
    return {};
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary' && !disabled && !loading) {
      e.currentTarget.style.backgroundColor = '#003a4a';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'primary' && !disabled && !loading) {
      e.currentTarget.style.backgroundColor = '#004D61';
    }
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={getButtonClasses()}
      disabled={isDisabled}
      onClick={onClick}
      style={getPrimaryStyle()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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