// src/app/contexts/AuthContext.tsx - FIXED VERSION
'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import { SessionData } from '../types';

interface AuthContextType {
  user: User | null;
  sessionData: SessionData | null;
  loading: boolean;
  logout: () => Promise<void>;
  protectSession: () => void;
  unprotectSession: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionProtected, setSessionProtected] = useState(false);
  const protectedUserRef = useRef<User | null>(null);
  const protectedSessionRef = useRef<SessionData | null>(null);

  // FIXED: Fetch session data from server with better error handling
  const fetchSessionData = async () => {
    try {
      console.log('🔍 fetchSessionData çağrıldı'); // EKLE
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });
      
      console.log('📡 Response status:', response.status); // EKLE
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Response data:', data); // EKLE
        
        setSessionData(data.session);
        return data.session;
      } else {
        console.log('❌ Response not ok'); // EKLE
        setSessionData(null);
        return null;
      }
    } catch (error) {
      console.log('💥 Fetch error:', error); // EKLE
      setSessionData(null);
      return null;
    }
  };

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
            setUser(firebaseUser);
            if (firebaseUser) {
              console.log('Fetching session data for user:', firebaseUser.uid);
              await fetchSessionData();
            } else {
              console.log('No Firebase user, but checking session anyway');
              // Firebase user yoksa da session kontrolü yap
              await fetchSessionData();
            }
          }
          setLoading(false);
          return;
        }
      }

      // Normal auth state change
      if (!sessionProtected) {
        setUser(firebaseUser);
        
        if (firebaseUser) {
          console.log('Fetching session data for user:', firebaseUser.uid);
          await fetchSessionData();
        } else {
          console.log('No Firebase user, but checking session anyway');
          // Firebase user yoksa da session kontrolü yap
          await fetchSessionData();
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionProtected]);

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
    
    // Re-check auth state
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      fetchSessionData();
    }
  };

  const refreshSession = async () => {
    console.log('Manually refreshing session...');
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