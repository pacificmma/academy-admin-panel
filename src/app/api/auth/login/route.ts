// src/app/api/auth/login/route.ts - SECURE LOGIN API (FIXED)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';

// ============================================
// TYPES & INTERFACES
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: {
    email: string;
    password: string;
  };
}

interface FailedAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get client IP address
function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const xClientIp = request.headers.get('x-client-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  return xRealIp || xClientIp || 'unknown';
}

// Input validation function
function validateLoginInput(body: any): ValidationResult {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { email, password } = body;

  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else {
    if (typeof email !== 'string') {
      errors.push('Email must be a string');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
      }
      if (email.length > 255) {
        errors.push('Email is too long');
      }
    }
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else {
    if (typeof password !== 'string') {
      errors.push('Password must be a string');
    } else {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters');
      }
      if (password.length > 128) {
        errors.push('Password is too long');
      }
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize data
  const sanitizedData = {
    email: email.toLowerCase().trim(),
    password: password // Don't trim password to preserve intentional spaces
  };

  return { isValid: true, errors: [], sanitizedData };
}

// ============================================
// SECURITY CONFIGURATION
// ============================================

const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  attemptWindow: 15 * 60 * 1000, // 15 minutes
};

// Track failed login attempts (in production, use Redis)
const failedAttempts = new Map<string, FailedAttempt>();

function checkAccountLockout(ip: string): { allowed: boolean; remainingTime: number } {
  const attempts = failedAttempts.get(ip);
  if (!attempts) return { allowed: true, remainingTime: 0 };

  const now = Date.now();
  
  // Check if still in lockout period
  if (attempts.blockedUntil && attempts.blockedUntil > now) {
    return { 
      allowed: false, 
      remainingTime: attempts.blockedUntil - now 
    };
  }

  // Check if too many recent attempts
  if (attempts.count >= SECURITY_CONFIG.maxFailedAttempts && 
      now - attempts.lastAttempt < SECURITY_CONFIG.attemptWindow) {
    
    const blockedUntil = now + SECURITY_CONFIG.lockoutDuration;
    attempts.blockedUntil = blockedUntil;
    
    return { 
      allowed: false, 
      remainingTime: SECURITY_CONFIG.lockoutDuration 
    };
  }

  return { allowed: true, remainingTime: 0 };
}

function recordFailedAttempt(ip: string, reason: string, details?: any) {
  const now = Date.now();
  const current = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  
  // Reset count if last attempt was too long ago
  if (now - current.lastAttempt > SECURITY_CONFIG.attemptWindow) {
    current.count = 0;
  }
  
  current.count++;
  current.lastAttempt = now;
  
  failedAttempts.set(ip, current);

  // Log security event (in production, send to logging service)
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Failed login attempt: ${reason}`, { 
      ip, 
      details, 
      timestamp: new Date().toISOString() 
    });
  }
}

function clearFailedAttempts(ip: string) {
  failedAttempts.delete(ip);
}

function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection';
    default:
      return 'Authentication failed. Please try again';
  }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// ============================================
// MAIN LOGIN ENDPOINT
// ============================================

export async function POST(request: NextRequest) {  
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    // Check for account lockout
    const lockoutCheck = checkAccountLockout(clientIP);
    if (!lockoutCheck.allowed) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: `Account temporarily locked. Try again in ${Math.ceil(lockoutCheck.remainingTime / 60000)} minutes.` 
        },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      recordFailedAttempt(clientIP, 'invalid_request');
      const response = NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Validate and sanitize input
    const validation = validateLoginInput(body);
    if (!validation.isValid) {
      recordFailedAttempt(clientIP, 'invalid_input');
      const response = NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const { email, password } = validation.sanitizedData!;

    // Firebase authentication
    let signInResult;
    try {
      signInResult = await signInWithEmailAndPassword(auth, email, password);
    } catch (authError: any) {      
      const errorMessage = getAuthErrorMessage(authError.code);
      recordFailedAttempt(clientIP, 'auth_failed', { 
        email, 
        errorCode: authError.code 
      });
      
      const response = NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const { user } = signInResult;

    // Check staff collection for authorization
    let staffDoc;
    try {
      staffDoc = await adminDb.collection('staff').doc(user.uid).get();
    } catch (dbError: any) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'db_error');
      const response = NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    if (!staffDoc.exists) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'unauthorized_user', { email });
      const response = NextResponse.json(
        { success: false, error: 'Access denied. Admin panel access required.' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const staffData = staffDoc.data();

    // Check if staff account is active
    if (!staffData?.isActive) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'inactive_user', { email });
      const response = NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Create session data
    const sessionData = {
      uid: user.uid,
      email: staffData.email,
      role: staffData.role,
      fullName: staffData.fullName || 
          `${staffData.firstName || ''} ${staffData.lastName || ''}`.trim() ||
          staffData.email.split('@')[0] || 'User',
      isActive: staffData.isActive
    };

    // Create session token
    let sessionToken;
    try {
      sessionToken = await createSession(sessionData);
    } catch (sessionError) {
      await auth.signOut();
      const response = NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    // Update last login timestamp
    try {
      await adminDb.collection('staff').doc(user.uid).update({
        lastLoginAt: new Date(),
        lastLoginIP: clientIP,
        lastLoginUserAgent: userAgent
      });
    } catch (updateError) {
      // Non-critical error, continue with login
      console.warn('Failed to update login timestamp:', updateError);
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIP);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: sessionData,
        redirectTo: staffData.role === 'admin' ? '/dashboard' : '/classes'
      },
      message: 'Login successful'
    });

    // Set secure session cookie
    setSessionCookie(response, sessionToken);

    return addSecurityHeaders(response);

  } catch (error: any) {
    console.error('Login error:', {
      error: error.message,
      ip: clientIP,
      timestamp: new Date().toISOString(),
    });
    
    const response = NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  const response = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}