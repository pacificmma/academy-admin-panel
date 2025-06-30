// src/app/components/auth/ProtectedRoutes.tsx - SECURE VERSION
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { UserRole } from '@/app/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  requireAuth = true 
}) => {
  const { user, sessionData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user && requireAuth) {
        router.push('/auth/login');
        return;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // ONLY use session data from server-side validation
        // NEVER query Firestore directly from client
        if (!sessionData) {
          // Force refresh session from server
          await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include',
          });
          return;
        }

        // Check if user has access based on server-validated session
        if (!sessionData.isActive) {
          setError('Your account has been deactivated. Please contact your administrator.');
          setLoading(false);
          return;
        }

        // Check role-based access if specified
        if (allowedRoles && !allowedRoles.includes(sessionData.role as UserRole)) {
          setError('You do not have permission to access this page.');
          setLoading(false);
          return;
        }

        setLoading(false);

      } catch (err: any) {
        setError('An error occurred while verifying your access. Please try again.');
        setLoading(false);
      }
    };

    checkUserAccess();
  }, [user, sessionData, allowedRoles, requireAuth, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user && requireAuth) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;