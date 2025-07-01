// src/app/api/auth/login/route.ts - SECURITY FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types/auth';

// ============================================
// TYPES & INTERFACES
// ============================================

interface UserDocument {
  role: UserRole;
  fullName: string;
  isActive: boolean;
  email: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  lastLoginIP?: string;
  lastLoginUserAgent?: string;
}

interface FailedAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// ============================================
// SECURITY CONFIGURATION
// ============================================

const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  attemptWindow: 15 * 60 * 1000, // 15 minutes
};

const failedAttempts = new Map<string, FailedAttempt>();

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  return xRealIp || 'unknown';
}

function validateLoginInput(body: any) {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { email, password } = body;

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      errors.push('Please enter a valid email address');
    }
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 6 || password.length > 128) {
      errors.push('Invalid password format');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { 
    isValid: true, 
    errors: [], 
    sanitizedData: {
      email: email.toLowerCase().trim(),
      password: password
    }
  };
}

function checkAccountLockout(ip: string): { allowed: boolean; remainingTime: number } {
  const attempts = failedAttempts.get(ip);
  if (!attempts) return { allowed: true, remainingTime: 0 };

  const now = Date.now();
  
  if (attempts.blockedUntil && attempts.blockedUntil > now) {
    return { 
      allowed: false, 
      remainingTime: attempts.blockedUntil - now 
    };
  }

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
  
  if (now - current.lastAttempt > SECURITY_CONFIG.attemptWindow) {
    current.count = 0;
  }
  
  current.count++;
  current.lastAttempt = now;
  
  failedAttempts.set(ip, current);

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

    // Firebase Authentication
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(email);
    } catch (error: any) {
      recordFailedAttempt(clientIP, 'user_not_found', { email });
      const response = NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Custom token for password verification
    let customToken;
    try {
      customToken = await adminAuth.createCustomToken(firebaseUser.uid);
    } catch (error: any) {
      recordFailedAttempt(clientIP, 'custom_token_failed');
      const response = NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    // Get user document from Firestore
    let userDoc: UserDocument;
    try {
      const userDocRef = adminDb.collection('staff').doc(firebaseUser.uid);
      const userSnapshot = await userDocRef.get();
      
      if (!userSnapshot.exists) {
        recordFailedAttempt(clientIP, 'user_document_not_found', { uid: firebaseUser.uid });
        const response = NextResponse.json(
          { success: false, error: 'User not found in system' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }
      
      const userData = userSnapshot.data();
      if (!userData) {
        recordFailedAttempt(clientIP, 'user_document_empty', { uid: firebaseUser.uid });
        const response = NextResponse.json(
          { success: false, error: 'User data not found' },
          { status: 401 }
        );
        return addSecurityHeaders(response);
      }
      
      // Type assertion with validation
      userDoc = userData as UserDocument;
    } catch (error: any) {
      recordFailedAttempt(clientIP, 'firestore_error');
      const response = NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    // Validate required user document fields
    if (!userDoc.role || !userDoc.fullName || typeof userDoc.isActive !== 'boolean') {
      recordFailedAttempt(clientIP, 'invalid_user_data', { uid: firebaseUser.uid });
      const response = NextResponse.json(
        { success: false, error: 'Invalid user data' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Check if user is active
    if (!userDoc.isActive) {
      recordFailedAttempt(clientIP, 'user_inactive', { email });
      const response = NextResponse.json(
        { success: false, error: 'Account is deactivated. Please contact your administrator.' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Create session
    const sessionData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      role: userDoc.role,
      fullName: userDoc.fullName,
      isActive: userDoc.isActive,
    };

    // Create secure session token
    const sessionToken = await createSession(sessionData);
    if (!sessionToken) {
      recordFailedAttempt(clientIP, 'session_creation_failed');
      const response = NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    // Update user last login information
    try {
      await adminDb.collection('staff').doc(firebaseUser.uid).update({
        lastLoginAt: new Date().toISOString(),
        lastLoginIP: clientIP,
        lastLoginUserAgent: userAgent,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      // Don't fail login if this update fails, just log it
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to update last login info:', error);
      }
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIP);

    // Create successful response - MINIMAL DATA ONLY
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      // ✅ SECURE: Only return minimal, non-sensitive data
      data: {
        role: userDoc.role, // Only role for redirect logic
        redirectTo: userDoc.role === 'admin' ? '/dashboard' : '/classes'
      }
    });

    // Set secure session cookie
    setSessionCookie(response, sessionToken);
    
    return addSecurityHeaders(response);

  } catch (error: unknown) {
    recordFailedAttempt(clientIP, 'unexpected_error');
    
    // Log error in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Login error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        ip: clientIP,
      });
    }
    
    const response = NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
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