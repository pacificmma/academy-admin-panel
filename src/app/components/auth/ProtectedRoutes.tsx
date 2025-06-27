'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/lib/firebase/config';
import { UserRole } from '@/app/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
}

interface UserData {
  type: 'staff' | 'member';
  role: string;
  isActive: boolean;
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  requireAuth = true 
}) => {
  const { user, sessionData, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
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
        console.log('Checking user access for:', user.uid);

        // Use session data if available
        if (sessionData) {
          setUserData({
            type: 'staff',
            role: sessionData.role,
            isActive: sessionData.isActive,
            fullName: sessionData.fullName,
          });
          setLoading(false);
          return;
        }

        // Fallback: Check Firestore directly
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));

        if (staffDoc.exists()) {
          const staffData = staffDoc.data();
          console.log('Found staff user:', staffData);

          if (staffData.isActive === false) {
            setError('Your staff account has been deactivated. Please contact your administrator.');
            setLoading(false);
            return;
          }

          setUserData({
            type: 'staff',
            role: staffData.role,
            isActive: staffData.isActive,
            fullName: staffData.fullName,
          });
          setLoading(false);
          return;
        }

        // Check if user is a member (should not have access)
        const memberProfileDoc = await getDoc(doc(db, 'memberProfiles', user.uid));

        if (memberProfileDoc.exists()) {
          setError('Access denied. This is the admin panel. Please use the customer portal instead.');
          setLoading(false);
          return;
        }

        // User not found in system
        setError('User not found in system. Please contact your administrator.');
        setLoading(false);

      } catch (err: any) {
        console.error('Error checking user access:', err);
        setError('An error occurred while verifying your access. Please try again.');
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkUserAccess();
    }
  }, [user, sessionData, authLoading, requireAuth, router]);

  // Check role permissions
  useEffect(() => {
    if (userData && allowedRoles && !allowedRoles.includes(userData.role as UserRole)) {
      router.push('/classes'); // Redirect to default page
      return;
    }
  }, [userData, allowedRoles, router]);

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background-default flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto"></div>
          <p className="mt-4 text-text-secondary">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="min-h-screen bg-background-default flex items-center justify-center p-4">
        <div className="bg-background-paper rounded-2xl shadow-soft p-8 max-w-md text-center">
          <div className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-semibold text-error-600 mb-2">Access Denied</h2>
            <p className="text-error-600 text-sm">{error}</p>
          </div>

          {error.includes('customer portal') && (
            <div className="bg-info-50 border border-info-200 rounded-lg p-4 mb-4">
              <p className="text-info-600 text-sm">
                <strong>Looking for the customer portal?</strong>
                <br />
                Please visit: <a 
                  href="https://www.pacificmma.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  www.pacificmma.com
                </a>
              </p>
            </div>
          )}

          <p className="text-text-secondary text-sm">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    );
  }

  // User has access
  if (userData?.type === 'staff' && userData.isActive) {
    return <>{children}</>;
  }

  return null;
};

export default ProtectedRoute;