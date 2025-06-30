// HIZLI GÜVENLİK DÜZELTMESİ - Mevcut sistemi minimum değişiklikle güvenli hale getirme

// 1. Enhanced LoginForm with basic security
// src/app/components/forms/LoginForm.tsx - SECURE VERSION
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  TextField, 
  Button, 
  InputAdornment,
  IconButton,
  Collapse
} from '@mui/material';
import { 
  Email as EmailIcon, 
  Lock as LockIcon, 
  Visibility, 
  VisibilityOff,
  Login as LoginIcon
} from '@mui/icons-material';
import CryptoJS from 'crypto-js';
import Alert from '@/app/components/ui/Alert';
import { useAuth } from '@/app/contexts/AuthContext';
import { LoginCredentials } from '@/app/types';

export default function SecureLoginForm() {
  const router = useRouter();
  const { refreshSession } = useAuth();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError(null);
  };

  // Create secure payload without exposing plain text password
  const createSecurePayload = (email: string, password: string) => {
    const timestamp = Date.now();
    const nonce = CryptoJS.lib.WordArray.random(128/8).toString();
    
    // Hash password with timestamp and nonce for basic security
    const saltedPassword = password + timestamp + nonce;
    const hashedPassword = CryptoJS.SHA256(saltedPassword).toString();
    
    // Create signature to prevent tampering
    const signature = CryptoJS.HmacSHA256(
      `${email}${hashedPassword}${timestamp}${nonce}`,
      process.env.NEXT_PUBLIC_APP_SECRET || 'pacific-mma-secret-2024'
    ).toString();

    return {
      email,
      passwordHash: hashedPassword,
      timestamp,
      nonce,
      signature
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Create secure payload
      const securePayload = createSecurePayload(formData.email, formData.password);
      
      // Clear password from memory immediately
      setFormData(prev => ({ ...prev, password: '' }));

      const response = await fetch('/api/auth/secure-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(securePayload),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.success) {
        await refreshSession();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const redirectTo = result.data?.redirectTo || '/dashboard';
        router.replace(redirectTo);
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
      // Reset form on error
      setFormData({ email: formData.email, password: '' });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.email && formData.password && !isLoading;

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {/* Error Alert */}
      <Collapse in={!!error}>
        <Box sx={{ mb: 3 }}>
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}
        </Box>
      </Collapse>

      {/* Email Field */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="admin@pacificmma.com"
          required
          disabled={isLoading}
          autoComplete="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiInputBase-root': { height: '56px' } }}
        />
      </Box>

      {/* Password Field */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
          placeholder="•••••••••"
          required
          disabled={isLoading}
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  disabled={isLoading}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiInputBase-root': { height: '56px' } }}
        />
      </Box>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        fullWidth
        disabled={!isFormValid}
        startIcon={isLoading ? undefined : <LoginIcon />}
        sx={{
          height: '48px',
          fontSize: '1rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          borderRadius: 2,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(15, 92, 107, 0.25)',
            transform: 'translateY(-1px)',
          },
          '&:disabled': {
            backgroundColor: 'grey.300',
            color: 'grey.500',
            cursor: 'not-allowed',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 20,
                border: '2px solid #ffffff40',
                borderTop: '2px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' },
                },
              }}
            />
            Signing In...
          </Box>
        ) : (
          'Sign In'
        )}
      </Button>
    </Box>
  );
}