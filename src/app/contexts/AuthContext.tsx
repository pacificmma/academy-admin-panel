// src/app/contexts/AuthContext.tsx - FIXED VERSION
'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth'; // Removed 'User' import from firebase/auth
import { auth } from '@/app/lib/firebase/config';
import { AuthUser, SessionData } from '../types/auth'; // Import AuthUser and SessionData

interface AuthContextType {
  user: AuthUser | null; // Changed to AuthUser
  sessionData: SessionData | null;
  loading: boolean;
  logout: () => Promise<void>;
  protectSession: () => void;
  unprotectSession: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null); // Changed to AuthUser
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionProtected, setSessionProtected] = useState(false);
  // protectedUserRef should also be AuthUser
  const protectedUserRef = useRef<AuthUser | null>(null); // Changed to AuthUser
  const protectedSessionRef = useRef<SessionData | null>(null);

// Fix for fetchSessionData function in AuthContext.tsx
const fetchSessionData = useCallback(async () => {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // FIXED: Use data.data instead of data.session
      // data.data contains the actual session information
      if (data.success && data.data && data.data.isActive) {
        // Set session data - convert to SessionData format
        const sessionData: SessionData = {
          uid: data.data.uid,
          email: data.data.email,
          role: data.data.role,
          fullName: data.data.fullName,
          isActive: data.data.isActive,
          createdAt: data.data.createdAt,
          expiresAt: data.data.expiresAt,
          lastActivity: data.data.lastActivity,
        };
        setSessionData(sessionData);
        
        // Set AuthUser data
        const authUser: AuthUser = {
          uid: data.data.uid,
          email: data.data.email,
          fullName: data.data.fullName,
          role: data.data.role,
          isActive: data.data.isActive,
          createdAt: new Date(data.data.createdAt).toISOString(),
        };
        setUser(authUser);
        
        return sessionData;
      } else {
        setSessionData(null);
        setUser(null);
        return null;
      }
    } else {
      setSessionData(null);
      setUser(null);
      return null;
    }
  } catch (error) {
    setSessionData(null);
    setUser(null);
    return null;
  }
}, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Session protection logic
      if (sessionProtected && protectedUserRef.current) {
        if (!firebaseUser || firebaseUser.uid !== protectedUserRef.current.uid) {        
          try {
            if (protectedSessionRef.current) {
              await restoreProtectedUser();
            }
          } catch (error) {
            console.error('Failed to restore protected session:', error);
            setSessionProtected(false);
            protectedUserRef.current = null;
            protectedSessionRef.current = null;
            // When falling back, explicitly fetch session to set the AuthUser with role
            if (firebaseUser) {
              await fetchSessionData();
            } else {
              setUser(null); // Clear user if no firebaseUser
              setSessionData(null); // Clear session data
            }
          }
          setLoading(false);
          return;
        }
      }

      // Normal auth state change or after session protection is lifted
      if (!sessionProtected) {
        if (firebaseUser) {
          await fetchSessionData(); // This will now correctly set the AuthUser state
        } else {
          await fetchSessionData(); // This will clear user/session if no active session
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionProtected, fetchSessionData]);

  const restoreProtectedUser = async () => {
    if (protectedUserRef.current && protectedSessionRef.current) {
      try {
        setUser(protectedUserRef.current);
        setSessionData(protectedSessionRef.current);
      } catch (error) {
        throw error;
      }
    }
  };

  const protectSession = async () => {
    if (user && sessionData) {
      protectedUserRef.current = user;
      protectedSessionRef.current = sessionData;
      setSessionProtected(true);
    }
  };

  const unprotectSession = () => {
    setSessionProtected(false);
    protectedUserRef.current = null;
    protectedSessionRef.current = null;
    
    // Re-check auth state to properly re-fetch user and session data
    const currentUser = auth.currentUser;
    if (currentUser) {
        fetchSessionData();
    } else {
        setUser(null);
        setSessionData(null);
    }
  };

  const refreshSession = async () => {
    await fetchSessionData();
  };

  const logout = async () => {
    try {
      // Clear session protection
      setSessionProtected(false);
      protectedUserRef.current = null;
      protectedSessionRef.current = null;
      
      // Call logout API to clear server session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local state
      setUser(null);
      setSessionData(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      sessionData,
      loading, 
      logout, 
      protectSession, 
      unprotectSession,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};