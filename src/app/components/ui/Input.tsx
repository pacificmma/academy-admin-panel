// src/app/components/ui/Input.tsx - Updated with sharp design
import React from 'react';
import { cn } from '@/app/lib/utils';
import { InputProps } from '@/app/types/staff';

const Input: React.FC<InputProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder,
  disabled = false,
  className,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label 
          htmlFor={name}
          className="block text-sm font-semibold text-text-primary tracking-wide"
        >
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={cn(
          'w-full px-4 py-3 rounded border-2 transition-all duration-150',
          'text-text-primary placeholder-text-light font-medium',
          'bg-background-paper',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          'disabled:bg-background-muted disabled:text-text-muted disabled:cursor-not-allowed disabled:border-border-light',
          error 
            ? 'border-error-500 focus:ring-error-500/20 focus:border-error-600' 
            : 'border-border-medium hover:border-border-dark',
          !error && !disabled && 'hover:border-border-dark'
        )}
        {...props}
      />
      
      {error && (
        <div className="flex items-center text-sm text-error-600 font-medium">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
};

export default Input;