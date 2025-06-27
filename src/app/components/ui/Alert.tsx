// src/app/components/ui/Alert.tsx
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/app/lib/utils';
import { AlertProps } from '@/app/types';


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
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCloseButtonColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-600 hover:bg-green-100 focus:ring-green-600';
      case 'error':
        return 'text-red-600 hover:bg-red-100 focus:ring-red-600';
      case 'warning':
        return 'text-yellow-600 hover:bg-yellow-100 focus:ring-yellow-600';
      case 'info':
        return 'text-blue-600 hover:bg-blue-100 focus:ring-blue-600';
      default:
        return 'text-gray-600 hover:bg-gray-100 focus:ring-gray-600';
    }
  };

  return (
    <div className={cn(
      'relative rounded-md border p-4 shadow-sm',
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
              'ml-4 flex-shrink-0 rounded-md p-1.5 inline-flex transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
              getCloseButtonColor()
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