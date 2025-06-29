// src/app/components/ui/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Button from './Button';
import { Logout } from '@mui/icons-material';

interface LogoutButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  sx?: any;
}

export default function LogoutButton({ 
  children = 'Logout', 
  variant = 'outline',
  size = 'md',
  sx 
}: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/login');
      router.refresh();
      
    } catch (error) {
      // Still redirect even if there's an error
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      loading={isLoading}
      variant={variant}
      size={size}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...sx,
      }}
    >
      <Logout fontSize="small" />
      {isLoading ? 'Logging out...' : children}
    </Button>
  );
}