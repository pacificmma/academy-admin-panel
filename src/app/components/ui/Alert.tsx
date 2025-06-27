// src/app/components/ui/Alert.tsx - Updated with sharp design
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
        return 'bg-success-50 border-success-500 text-success-800';
      case 'error':
        return 'bg-error-50 border-error-500 text-error-800';
      case 'warning':
        return 'bg-warning-50 border-warning-500 text-warning-800';
      case 'info':
        return 'bg-info-50 border-info-500 text-info-800';
      default:
        return 'bg-background-muted border-border-medium text-text-primary';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return 'text-success-600';
      case 'error':
        return 'text-error-600';
      case 'warning':
        return 'text-warning-600';
      case 'info':
        return 'text-info-600';
      default:
        return 'text-text-muted';
    }
  };

  const getCloseButtonColor = () => {
    switch (type) {
      case 'success':
        return 'text-success-600 hover:bg-success-100 focus:ring-success-600';
      case 'error':
        return 'text-error-600 hover:bg-error-100 focus:ring-error-600';
      case 'warning':
        return 'text-warning-600 hover:bg-warning-100 focus:ring-warning-600';
      case 'info':
        return 'text-info-600 hover:bg-info-100 focus:ring-info-600';
      default:
        return 'text-text-muted hover:bg-background-muted focus:ring-primary-500';
    }
  };

  return (
    <div className={cn(
      'relative rounded border-2 p-4 shadow-soft animate-slide-down',
      getStyles()
    )}>
      <div className="flex items-start">
        <div className={cn('flex-shrink-0', getIconColor())}>
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-semibold mb-1 tracking-wide">
              {title}
            </h3>
          )}
          <p className="text-sm font-medium">
            {message}
          </p>
        </div>
        
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'ml-4 flex-shrink-0 rounded p-1.5 inline-flex transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2',
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