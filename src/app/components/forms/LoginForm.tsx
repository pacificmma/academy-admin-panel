// src/app/components/forms/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import Alert from '@/app/components/ui/Alert';
import { LoginCredentials } from '@/app/types/staff';

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    console.log('🔐 Login attempt started for:', formData.email);

    try {
      console.log('📤 Sending request to /api/auth/login');
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include', // Bu önemli - cookie'ler için
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('📥 Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      if (result.success) {
        console.log('✅ Login successful for user:', result.user);
        
        // Redirect based on user role
        const userRole = result.user?.role;
        console.log('🔄 Redirecting based on role:', userRole);
        
        if (userRole === 'admin') {
          console.log('🔄 Redirecting to /dashboard');
          router.push('/dashboard');
        } else {
          console.log('🔄 Redirecting to /classes');
          router.push('/classes');
        }
        router.refresh();
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={(value) => handleChange('email', value)}
        placeholder="Enter your email address"
        required
        disabled={isLoading}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        onChange={(value) => handleChange('password', value)}
        placeholder="Enter your password"
        required
        disabled={isLoading}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isLoading}
        disabled={!formData.email || !formData.password}
        className="w-full"
      >
        {isLoading ? 'Signing In...' : 'SIGN IN'}
      </Button>
    </form>
  );
}