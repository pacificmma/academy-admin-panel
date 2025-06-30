// src/app/lib/auth/session.ts - SECURE SESSION MANAGEMENT
import { NextRequest, NextResponse } from 'next/server';
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
};

// Get JWT secret with validation
function getJWTSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT secret must be at least 32 characters long');
  }
  return secret;
}

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

// Verify and decode session token
export async function verifySession(token: string): Promise<SessionData | null> {
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

    // Verify user still exists and is active (for critical operations)
    try {
      const staffDoc = await adminDb.collection('staff').doc(decoded.uid).get();
      if (!staffDoc.exists || !staffDoc.data()?.isActive) {
        return null;
      }
    } catch (error) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

// Check if session needs refresh
export function shouldRefreshSession(sessionData: SessionData): boolean {
  const now = Date.now();
  return (sessionData.expiresAt - now) < SESSION_CONFIG.refreshThreshold;
}

// Refresh session token
export async function refreshSession(currentSession: SessionData): Promise<string> {
  const now = Date.now();
  
  // Update last activity and extend expiration
  const refreshedSession: SessionData = {
    ...currentSession,
    lastActivity: now,
    expiresAt: now + SESSION_CONFIG.maxAge,
  };

  return jwt.sign(refreshedSession, getJWTSecret(), {
    algorithm: 'HS256',
    expiresIn: '24h',
    issuer: 'pacific-mma-admin',
    audience: 'pacific-mma-admin-users',
  });
}

// Set secure HTTP-only cookie
export function setSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  response.cookies.set('session-token', token, {
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
  response.cookies.delete('session-token');
}

// Get session from request
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get('session-token')?.value;
  
  if (!token) {
    return null;
  }

  return await verifySession(token);
}

// Middleware helper for role-based access
export function requireRole(allowedRoles: UserRole[]) {
  return async (request: NextRequest): Promise<{ allowed: boolean; session: SessionData | null }> => {
    const session = await getSession(request);
    
    if (!session) {
      return { allowed: false, session: null };
    }

    const hasPermission = allowedRoles.includes(session.role);
    return { allowed: hasPermission, session };
  };
}

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

    if (requiredRoles.length > 0 && !requiredRoles.includes(session.role)) {
      return { success: false, session, error: 'Insufficient permissions' };
    }

    return { success: true, session };
  } catch (error) {
    return { success: false, session: null, error: 'Session validation failed' };
  }
}