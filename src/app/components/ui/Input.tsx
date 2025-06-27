// src/app/components/ui/Input.tsx
import React, { forwardRef } from 'react';
import {
  TextField,
  TextFieldProps,
  InputAdornment,
  FormHelperText,
  Box,
  Typography,
} from '@mui/material';

// Güncellenmiş InputProps interface
export interface InputProps extends Omit<TextFieldProps, 'onChange' | 'size'> {
  name: string;
  value: string;
  onChange: (value: string) => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  showCharacterCount?: boolean;
  maxLength?: number;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  name,
  value,
  onChange,
  leftIcon,
  rightIcon,
  size = 'medium',
  showCharacterCount = false,
  maxLength,
  helperText,
  error,
  ...props
}, ref) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // MaxLength validation
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
  };

  // Character count
  const characterCount = value.length;
  const isNearLimit = maxLength && characterCount >= maxLength * 0.9;

  // Size mapping
  const muiSize = size === 'large' ? 'medium' : size === 'small' ? 'small' : 'medium';
  
  // Custom height based on size
  const getCustomHeight = () => {
    switch (size) {
      case 'small':
        return '40px';
      case 'large':
        return '56px';
      default:
        return '48px';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TextField
        ref={ref}
        name={name}
        value={value}
        onChange={handleChange}
        size={muiSize}
        error={!!error}
        helperText={false} // We'll handle this separately
        fullWidth
        InputProps={{
          ...(leftIcon && {
            startAdornment: (
              <InputAdornment position="start">
                {leftIcon}
              </InputAdornment>
            ),
          }),
          ...(rightIcon && {
            endAdornment: (
              <InputAdornment position="end">
                {rightIcon}
              </InputAdornment>
            ),
          }),
          sx: {
            height: getCustomHeight(),
            '& .MuiInputBase-input': {
              height: 'auto',
              py: size === 'small' ? 1 : size === 'large' ? 2 : 1.5,
              fontSize: size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem',
              fontWeight: 500,
            },
          },
        }}
        {...props}
      />
      
      {/* Character Count */}
      {showCharacterCount && maxLength && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Typography
            variant="caption"
            color={isNearLimit ? 'warning.main' : characterCount >= maxLength ? 'error.main' : 'text.secondary'}
            sx={{ fontWeight: 500 }}
          >
            {characterCount}/{maxLength}
          </Typography>
        </Box>
      )}

      {/* Error or Helper Text */}
      {(error || helperText) && (
        <FormHelperText
          error={!!error}
          sx={{
            mx: 0,
            mt: 0.5,
            fontSize: '0.875rem',
            fontWeight: error ? 600 : 400,
          }}
        >
          {error || helperText}
        </FormHelperText>
      )}
    </Box>
  );
});

Input.displayName = 'Input';

export default Input;