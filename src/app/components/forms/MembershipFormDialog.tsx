// src/app/components/forms/LoginForm.tsx - FIXED VERSION with AuthContext Integration
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
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
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import Alert from '@/app/components/ui/Alert';
import { useAuth } from '@/app/contexts/AuthContext';
import { LoginCredentials } from '@/app/types';

export default function LoginForm() {
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
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Call login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.success) {
        // Step 2: Refresh the auth context to get the latest session
        await refreshSession();
        
        // Step 3: Small delay to ensure auth state is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Step 4: Redirect based on role
        const redirectTo = result.data?.redirectTo || '/dashboard';
        
        // Use replace instead of push for login redirects
        router.replace(redirectTo);
        
        // Force a page refresh to ensure all components get the new auth state
        window.location.href = redirectTo;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
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
          placeholder="john.doe@company.com"
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
          sx={{
            '& .MuiInputBase-root': {
              height: '56px',
            },
          }}
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
          sx={{
            '& .MuiInputBase-root': {
              height: '56px',
            },
          }}
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

      {/* Development Login Hints */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary">
            Development Mode: Use your admin credentials to log in
          </Typography>
        </Box>
      )}
    </Box>
  );
}