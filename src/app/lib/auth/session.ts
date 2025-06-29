// src/app/lib/auth/session.ts - Enhanced Security
import { SessionData } from '@/app/types';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;
const SESSION_COOKIE_NAME = 'pacific-mma-session';

// Enhanced session creation with additional security
export async function createSession(userData: SessionData, request?: NextRequest): Promise<string> {
  const userAgent = request?.headers.get('user-agent') || '';
  const ip = request?.headers.get('x-forwarded-for') || 
             request?.headers.get('x-real-ip') || 
             'unknown';

  const token = jwt.sign(
    {
      uid: userData.uid,
      email: userData.email,
      role: userData.role,
      fullName: userData.fullName,
      isActive: userData.isActive,
      // Security metadata
      iat: Math.floor(Date.now() / 1000),
      userAgent: hashString(userAgent), // Hash for privacy
      ipHash: hashString(ip), // Hash for privacy
    },
    JWT_SECRET,
    {
      expiresIn: '24h', // Reduced from 7 days for security
      issuer: 'pacific-mma-admin',
      audience: 'pacific-mma-users',
      algorithm: 'HS256',
    }
  );

  return token;
}

// Enhanced session verification
export async function verifySession(token: string, request?: NextRequest): Promise<SessionData | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'pacific-mma-admin',
      audience: 'pacific-mma-users',
      algorithms: ['HS256'],
    }) as any;

    // Optional: Verify user agent and IP for additional security
    if (request && process.env.NODE_ENV === 'production') {
      const currentUserAgent = request.headers.get('user-agent') || '';
      
      if (decoded.userAgent && decoded.userAgent !== hashString(currentUserAgent)) {
        console.warn('Session user agent mismatch');
        return null;
      }
    }

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

// Get session from request (for middleware)
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySession(token, request);
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

// Enhanced cookie configuration
export function setSessionCookie(token: string): string {
  const maxAge = 24 * 60 * 60; // 24 hours
  const isProduction = process.env.NODE_ENV === 'production';
  
  return [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    `Max-Age=${maxAge}`,
    'SameSite=Strict', // Enhanced from Lax
    isProduction ? 'Secure' : '',
    // Remove Domain for now - will be set later when you have your domain
  ].filter(Boolean).join('; ');
}

// Clear session cookie - MISSING FUNCTION ADDED
export function clearSessionCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'Max-Age=0',
    'SameSite=Strict',
    isProduction ? 'Secure' : '',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT', // Ensure immediate expiry
  ].filter(Boolean).join('; ');
}

// Helper function to hash sensitive data
function hashString(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

// Refresh session (extend expiry)
export async function refreshSession(currentToken: string, request?: NextRequest): Promise<string | null> {
  try {
    const sessionData = await verifySession(currentToken, request);
    if (!sessionData) return null;

    // Create a new token with extended expiry
    return await createSession(sessionData, request);
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