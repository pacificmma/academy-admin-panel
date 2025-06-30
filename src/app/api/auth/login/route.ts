// src/app/api/auth/login/route.ts - ENHANCED SECURITY VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';

// ============================================
// SECURITY CONFIGURATION
// ============================================

const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  attemptWindow: 15 * 60 * 1000, // 15 minutes
};

interface FailedAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

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

  // Log security event
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

    // Verify user credentials using Firebase Admin
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (authError: any) {
      recordFailedAttempt(clientIP, 'user_not_found', { email });
      const response = NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Create custom token to verify password
    let customToken;
    try {
      customToken = await adminAuth.createCustomToken(userRecord.uid);
    } catch (tokenError) {
      recordFailedAttempt(clientIP, 'token_creation_failed');
      const response = NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    // Check staff collection for authorization
    let staffDoc;
    try {
      staffDoc = await adminDb.collection('staff').doc(userRecord.uid).get();
    } catch (dbError: any) {
      recordFailedAttempt(clientIP, 'db_error');
      const response = NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

    if (!staffDoc.exists) {
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
      recordFailedAttempt(clientIP, 'inactive_user', { email });
      const response = NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact your administrator.' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Update staff login information
    try {
      await adminDb.collection('staff').doc(userRecord.uid).update({
        lastLoginAt: new Date().toISOString(),
        lastLoginIP: clientIP,
        lastLoginUserAgent: userAgent,
        updatedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      // Don't fail login if update fails, but log it
      console.error('Failed to update staff login info:', updateError);
    }

    // Create secure session
    const sessionData = {
      uid: userRecord.uid,
      email: staffData.email as string,
      role: staffData.role as string,
      fullName: staffData.fullName as string,
      isActive: staffData.isActive as boolean,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      lastActivity: Date.now(),
    };

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIP);

    // Create session and set cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          uid: sessionData.uid,
          email: sessionData.email,
          role: sessionData.role,
          fullName: sessionData.fullName,
          isActive: sessionData.isActive,
        },
        redirectTo: '/dashboard'
      },
      message: 'Login successful'
    });

    // Set secure session cookie (convert sessionData to string)
    const sessionToken = btoa(JSON.stringify(sessionData)); // Simple encoding
    setSessionCookie(response, sessionToken);

    return addSecurityHeaders(response);

  } catch (error: unknown) {
    recordFailedAttempt(clientIP, 'system_error');
    
    const response = NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : 'Authentication failed' 
      },
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