// src/app/components/ui/Input.tsx
import React from 'react';
import { cn } from '@/app/lib/utils';
import { InputProps } from '@/app/types';


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
    <div className={cn('mb-6', className)}>
      {label && (
        <label 
          htmlFor={name}
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
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
          'bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500',
          error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : '',
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        )}
        {...props}
      />
      
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-500">
          <span className="font-medium">Error:</span> {error}
        </p>
      )}
    </div>
  );
};

export default Input;