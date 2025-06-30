// src/app/lib/auth/session.ts - COMPLETE SECURE SESSION MANAGEMENT (FIXED)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { adminDb } from '@/app/lib/firebase/admin';
import { UserRole } from '@/app/types';

export interface SessionData {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

// Security configuration
const SESSION_CONFIG = {
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 2 * 60 * 60 * 1000, // 2 hours
  absoluteTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days max
  cookieName: 'session-token',
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get JWT secret with validation
function getJWTSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }
  return secret;
}

// Verify JWT token
async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const decoded = jwt.verify(token, getJWTSecret(), {
      algorithms: ['HS256'],
      issuer: 'pacific-mma-admin',
      audience: 'pacific-mma-admin-users',
    }) as SessionData;

    const now = Date.now();

    // Check if session is expired
    if (decoded.expiresAt < now) {
      return null;
    }

    // Check absolute timeout
    if (now - decoded.createdAt > SESSION_CONFIG.absoluteTimeout) {
      return null;
    }

    // Verify user still exists and is active in database
    try {
      const staffDoc = await adminDb.collection('staff').doc(decoded.uid).get();
      if (!staffDoc.exists || !staffDoc.data()?.isActive) {
        return null;
      }
    } catch (dbError) {
      console.error('Database verification failed during session check:', dbError);
      return null;
    }

    return decoded;
  } catch (error) {
    // Invalid token or verification failed
    return null;
  }
}

// Check if session should be refreshed
function shouldRefreshSession(sessionData: SessionData): boolean {
  const now = Date.now();
  const timeSinceLastActivity = now - sessionData.lastActivity;
  return timeSinceLastActivity > SESSION_CONFIG.refreshThreshold;
}

// Refresh session with new timestamps
async function refreshSession(sessionData: SessionData): Promise<string> {
  const now = Date.now();
  const refreshedSession: SessionData = {
    ...sessionData,
    lastActivity: now,
    expiresAt: now + SESSION_CONFIG.maxAge,
  };

  // Verify user is still active
  const staffDoc = await adminDb.collection('staff').doc(sessionData.uid).get();
  if (!staffDoc.exists || !staffDoc.data()?.isActive) {
    throw new Error('User is no longer active');
  }

  return jwt.sign(refreshedSession, getJWTSecret(), {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'pacific-mma-admin',
    audience: 'pacific-mma-admin-users',
  });
}

// ============================================
// MAIN SESSION FUNCTIONS
// ============================================

// Create secure session token
export async function createSession(userData: Omit<SessionData, 'createdAt' | 'expiresAt' | 'lastActivity'>): Promise<string> {
  const now = Date.now();
  const sessionData: SessionData = {
    ...userData,
    createdAt: now,
    expiresAt: now + SESSION_CONFIG.maxAge,
    lastActivity: now,
  };

  // Verify user still exists and is active
  try {
    const staffDoc = await adminDb.collection('staff').doc(userData.uid).get();
    if (!staffDoc.exists || !staffDoc.data()?.isActive) {
      throw new Error('User is not active or does not exist');
    }
  } catch (error) {
    throw new Error('Failed to validate user status');
  }

  const token = jwt.sign(sessionData, getJWTSecret(), {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'pacific-mma-admin',
    audience: 'pacific-mma-admin-users',
  });

  return token;
}

// Set session cookie with secure options
export function setSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  response.cookies.set(SESSION_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: SESSION_CONFIG.maxAge / 1000, // Convert to seconds
    path: '/',
    ...(isProduction && { domain: process.env.NEXT_PUBLIC_APP_DOMAIN }),
  });
}

// Clear session cookie
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_CONFIG.cookieName);
}

// Get session from request (for middleware and API routes)
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get(SESSION_CONFIG.cookieName)?.value;
  
  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// ============================================
// SERVER-SIDE SESSION (For SSR/SSG)
// ============================================

// **FIX: This was missing!** 
// Get session from server-side (for page components)
export async function getServerSession(): Promise<SessionData | null> {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get(SESSION_CONFIG.cookieName)?.value;
    
    if (!token) {
      return null;
    }

    return await verifySession(token);
  } catch (error) {
    // Return null if any error occurs
    return null;
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

// Update session activity (for session endpoint)
export async function updateSessionActivity(sessionData: SessionData): Promise<string | null> {
  const now = Date.now();
  
  // Check if refresh is needed
  if (shouldRefreshSession(sessionData)) {
    try {
      return await refreshSession(sessionData);
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }

  // Update activity timestamp even if not refreshing
  const updatedSession: SessionData = {
    ...sessionData,
    lastActivity: now,
  };

  try {
    return jwt.sign(updatedSession, getJWTSecret(), {
      algorithm: 'HS256',
      expiresIn: '24h',
      issuer: 'pacific-mma-admin',
      audience: 'pacific-mma-admin-users',
    });
  } catch (error) {
    console.error('Session activity update failed:', error);
    return null;
  }
}

// ============================================
// API AUTHENTICATION
// ============================================

// Secure session validation for API routes
export async function validateAPIAccess(
  request: NextRequest,
  requiredRoles: UserRole[] = []
): Promise<{ success: boolean; session: SessionData | null; error?: string }> {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return { success: false, session: null, error: 'Authentication required' };
    }

    if (!session.isActive) {
      return { success: false, session: null, error: 'Account deactivated' };
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(session.role)) {
      return { success: false, session, error: 'Insufficient permissions' };
    }

    return { success: true, session };
  } catch (error) {
    console.error('API access validation failed:', error);
    return { success: false, session: null, error: 'Session validation failed' };
  }
}

// Enhanced API session validation (throws errors for middleware)
export async function validateApiSession(request: NextRequest): Promise<SessionData> {
  const session = await getSession(request);
  
  if (!session) {
    throw new Error('No valid session found');
  }

  if (!session.isActive) {
    throw new Error('User account is deactivated');
  }

  return session;
}