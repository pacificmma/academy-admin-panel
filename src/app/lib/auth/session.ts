// src/app/lib/auth/session.ts - Session management with JWT
import { SessionData } from '@/app/types';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;
const SESSION_COOKIE_NAME = 'pacific-mma-session';

// Create a session token
export async function createSession(userData: SessionData): Promise<string> {
  const token = jwt.sign(
    {
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
      fullName: userData.fullName,
      isActive: userData.isActive,
    },
    JWT_SECRET,
    {
      expiresIn: '7d', // 7 days
      issuer: 'pacific-mma-admin',
      audience: 'pacific-mma-users',
    }
  );

  return token;
}

// Verify session token
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pacific-mma-admin',
      audience: 'pacific-mma-users',
    }) as SessionData & { exp: number; iat: number };

    // Return the session data without JWT metadata
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName,
      isActive: decoded.isActive,
    };
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

// Get session from request
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySession(token);
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

// Get session from server components (using cookies())
export async function getServerSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySession(token);
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

// Set session cookie (use in API routes)
export function setSessionCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Lax',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

// Clear session cookie
export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Lax',
  ].join('; ');
}

// Refresh session (extend expiry)
export async function refreshSession(currentToken: string): Promise<string | null> {
  try {
    const sessionData = await verifySession(currentToken);
    if (!sessionData) return null;

    // Create a new token with extended expiry
    return await createSession(sessionData);
  } catch (error) {
    console.error('Error refreshing session:', error);
    return null;
  }
}

// Validate session for API routes
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

// Role-based authorization
export function authorizeRole(session: SessionData, allowedRoles: string[]): boolean {
  return allowedRoles.includes(session.role);
}

// Admin-only authorization
export function requireAdmin(session: SessionData): void {
  if (session.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

// Staff or higher authorization
export function requireStaff(session: SessionData): void {
  if (!['admin', 'trainer', 'staff'].includes(session.role)) {
    throw new Error('Staff access required');
  }
}