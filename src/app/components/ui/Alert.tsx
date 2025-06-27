// src/app/components/ui/Alert.tsx
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { AlertProps } from '@/app/types/staff';

const Alert: React.FC<AlertProps> = ({
  type,
  title,
  message,
  onClose,
  autoClose = false,
  duration = 5000,
}) => {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={cn(
      'relative rounded-lg border p-4',
      getStyles()
    )}>
      <div className="flex items-start">
        <div className={cn('flex-shrink-0', getIconColor())}>
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          <p className="text-sm">
            {message}
          </p>
        </div>
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'ml-4 flex-shrink-0 rounded-md p-1.5 inline-flex hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2',
              type === 'success' && 'text-green-500 hover:bg-green-600 focus:ring-green-600',
              type === 'error' && 'text-red-500 hover:bg-red-600 focus:ring-red-600',
              type === 'warning' && 'text-yellow-500 hover:bg-yellow-600 focus:ring-yellow-600',
              type === 'info' && 'text-blue-500 hover:bg-blue-600 focus:ring-blue-600'
            )}
          >
            <span className="sr-only">Dismiss</span>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;