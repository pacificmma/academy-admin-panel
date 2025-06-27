// src/app/components/ui/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
  children: React.ReactNode;
  className?: string;
}

export default function LogoutButton({ children, className }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      console.log('🚪 Starting logout...');
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      console.log('📥 Logout response status:', response.status);

      // Redirect to login regardless of response
      console.log('🔄 Redirecting to login...');
      router.push('/login');
      router.refresh();
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still redirect even if there's an error
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Logging out...' : children}
    </button>
  );
}