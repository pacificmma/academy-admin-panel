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
}