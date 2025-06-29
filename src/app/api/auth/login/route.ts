// src/app/api/auth/login/route.ts - Enhanced with proper validation
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';

// Inline validation utilities (to replace unused validation.ts)
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

// Input validation and sanitization
function validateAndSanitizeLoginInput(body: any): ValidationResult {
  const errors: string[] = [];
  
  // Check if body exists
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

  // Return validation result
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

// Security utilities (inline instead of separate config file)
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  attemptWindow: 15 * 60 * 1000, // 15 minutes
};

// Track failed login attempts (in production, use Redis)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

// Security helper functions
function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const xClientIp = request.headers.get('x-client-ip');
  
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  return xRealIp || xClientIp || 'unknown';
}

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
}

function clearFailedAttempts(ip: string) {
  failedAttempts.delete(ip);
}

function validateEnvironment() {
  const required = [
    'NEXTAUTH_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing
  };
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

export async function POST(request: NextRequest) {  
  try {
    // Get client IP for security tracking
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check for account lockout
    const lockoutCheck = checkAccountLockout(clientIP);
    if (!lockoutCheck.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Account temporarily locked. Try again in ${Math.ceil(lockoutCheck.remainingTime / 60000)} minutes.` 
        },
        { status: 429 }
      );
    }

    // Validate environment variables
    const envCheck = validateEnvironment();
    if (!envCheck.valid) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      recordFailedAttempt(clientIP, 'invalid_request');
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }

    // Validate and sanitize input using our inline validation
    const validation = validateAndSanitizeLoginInput(body);
    if (!validation.isValid) {
      recordFailedAttempt(clientIP, 'invalid_input');
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
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
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 401 }
      );
    }

    const { user } = signInResult;

    // Check staff collection
    let staffDoc;
    try {
      const staffDocRef = adminDb.collection('staff').doc(user.uid);
      staffDoc = await staffDocRef.get();
    } catch (dbError: any) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'db_error');
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    if (!staffDoc.exists) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'unauthorized_user', { email });
      return NextResponse.json(
        { success: false, error: 'Access denied. You are not authorized to use this system' },
        { status: 403 }
      );
    }

    const staffData = staffDoc.data();
    // Check if user account is active
    if (!staffData?.isActive) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'inactive_account', { email });
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact your administrator' },
        { status: 403 }
      );
    }

    // Validate required staff data
    if (!staffData.role || !staffData.fullName) {
      await auth.signOut();
      recordFailedAttempt(clientIP, 'incomplete_profile');
      return NextResponse.json(
        { success: false, error: 'Account setup incomplete. Please contact your administrator' },
        { status: 422 }
      );
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIP);

    // Update login tracking in database
    try {
      await staffDoc.ref.update({
        lastLoginAt: new Date().toISOString(),
        lastLoginIP: clientIP,
        lastLoginUserAgent: userAgent,
        loginCount: (staffData.loginCount || 0) + 1,
      });
    } catch (updateError) {
    }

    // Create enhanced session
    const sessionData = {
      uid: user.uid,
      email: user.email!,
      role: staffData.role,
      fullName: staffData.fullName,
      isActive: staffData.isActive,
    };

    let sessionToken;
    try {
      sessionToken = await createSession(sessionData, request);
    } catch (sessionError: any) {
      await auth.signOut();
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Create response with security headers
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        role: staffData.role,
        fullName: staffData.fullName,
      },
    });

    // Set secure HTTP-only cookie
    response.headers.set('Set-Cookie', setSessionCookie(sessionToken));
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');

    return response;

  } catch (error: any) {

    
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const cutoff = now - (2 * SECURITY_CONFIG.attemptWindow);
  
  for (const [ip, attempts] of failedAttempts.entries()) {
    if (attempts.lastAttempt < cutoff && (!attempts.blockedUntil || attempts.blockedUntil < now)) {
      failedAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes