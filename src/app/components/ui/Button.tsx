// src/app/components/ui/Button.tsx
import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  Box,
} from '@mui/material';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  sx,
  ...props
}) => {
  
  // Variant mapping
  const getVariantProps = () => {
    switch (variant) {
      case 'primary':
        return { variant: 'contained' as const, color: 'primary' as const };
      case 'secondary':
        return { variant: 'contained' as const, color: 'secondary' as const };
      case 'outline':
        return { variant: 'outlined' as const, color: 'primary' as const };
      case 'ghost':
        return { variant: 'text' as const, color: 'primary' as const };
      case 'danger':
        return { variant: 'contained' as const, color: 'error' as const };
      case 'success':
        return { variant: 'contained' as const, color: 'success' as const };
      case 'warning':
        return { variant: 'contained' as const, color: 'warning' as const };
      default:
        return { variant: 'contained' as const, color: 'primary' as const };
    }
  };

  // Size mapping
  const getMuiSize = () => {
    switch (size) {
      case 'sm':
        return 'small' as const;
      case 'lg':
        return 'large' as const;
      default:
        return 'medium' as const;
    }
  };

  // Custom size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          fontSize: '0.875rem',
          padding: '6px 16px',
          minHeight: '32px',
        };
      case 'lg':
        return {
          fontSize: '1.125rem',
          padding: '12px 24px',
          minHeight: '48px',
        };
      default:
        return {
          fontSize: '1rem',
          padding: '10px 20px',
          minHeight: '40px',
        };
    }
  };

  const variantProps = getVariantProps();
  const muiSize = getMuiSize();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <MuiButton
      {...variantProps}
      size={muiSize}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      sx={{
        ...sizeStyles,
        fontWeight: 600,
        borderRadius: 2,
        textTransform: 'none',
        boxShadow: 'none',
        position: 'relative',
        '&:hover': {
          boxShadow: variant === 'ghost' ? 'none' : '0 4px 8px rgba(0, 77, 97, 0.15)',
          transform: variant === 'ghost' ? 'none' : 'translateY(-1px)',
        },
        '&.Mui-disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
        },
        transition: 'all 0.2s ease-in-out',
        ...sx,
      }}
      {...props}
    >
      {loading && (
        <Box
          sx={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
        >
          <CircularProgress
            size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
            color="inherit"
          />
        </Box>
      )}
      <Box
        sx={{
          opacity: loading ? 0 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {children}
      </Box>
    </MuiButton>
  );
};

export default Button;