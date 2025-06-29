// src/app/api/auth/login/route.ts - Enhanced Security
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/app/lib/firebase/config';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';

// Track failed login attempts (in production, use Redis or external storage)
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

// Security configuration
const SECURITY_CONFIG = {
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  attemptWindow: 15 * 60 * 1000, // 15 minutes
};

export async function POST(request: NextRequest) {
  console.log('🚀 Enhanced Login API called');
  
  try {
    // Get client IP for security tracking
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    console.log('🔍 Login attempt from IP:', clientIP);

    // Check for account lockout
    const lockoutCheck = checkAccountLockout(clientIP);
    if (!lockoutCheck.allowed) {
      console.log('🔒 Account locked out:', clientIP);
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
      console.error('❌ Environment validation failed:', envCheck.missing);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log('📥 Request body parsed for email:', body.email);
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      recordFailedAttempt(clientIP, 'invalid_request');
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Input validation
    const validation = validateLoginInput(email, password);
    if (!validation.valid) {
      console.log('❌ Input validation failed:', validation.errors);
      recordFailedAttempt(clientIP, 'invalid_input');
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();

    console.log('✅ Input validation passed for:', sanitizedEmail);

    // Import Firebase modules dynamically
    let signInResult;
    try {
      console.log('🔐 Attempting Firebase authentication...');
      signInResult = await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      console.log('✅ Firebase authentication successful:', signInResult.user.uid);
    } catch (authError: any) {
      console.error('❌ Firebase auth error:', authError.code, authError.message);
      
      const errorMessage = getAuthErrorMessage(authError.code);
      recordFailedAttempt(clientIP, 'auth_failed', { 
        email: sanitizedEmail, 
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
      console.log('📄 Checking staff collection for user:', user.uid);
      const staffDocRef = adminDb.collection('staff').doc(user.uid);
      staffDoc = await staffDocRef.get();
      console.log('📄 Staff doc exists:', staffDoc.exists);
    } catch (dbError: any) {
      console.error('❌ Database error:', dbError);
      await auth.signOut();
      recordFailedAttempt(clientIP, 'db_error');
      return NextResponse.json(
        { success: false, error: 'Database connection error' },
        { status: 500 }
      );
    }

    if (!staffDoc.exists) {
      console.log('❌ User not found in staff collection');
      await auth.signOut();
      recordFailedAttempt(clientIP, 'unauthorized_user', { email: sanitizedEmail });
      return NextResponse.json(
        { success: false, error: 'Access denied. You are not authorized to use this system' },
        { status: 403 }
      );
    }

    const staffData = staffDoc.data();
    console.log('📄 Staff data loaded for role:', staffData?.role);

    // Check if user account is active
    if (!staffData?.isActive) {
      console.log('❌ User account is inactive');
      await auth.signOut();
      recordFailedAttempt(clientIP, 'inactive_account', { email: sanitizedEmail });
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact your administrator' },
        { status: 403 }
      );
    }

    // Validate required staff data
    if (!staffData.role || !staffData.fullName) {
      console.log('❌ Incomplete staff data');
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
      console.log('✅ Login tracking updated');
    } catch (updateError) {
      console.warn('⚠️ Could not update login tracking:', updateError);
      // Don't fail the login for this
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
      console.log('🎫 Creating enhanced session...');
      sessionToken = await createSession(sessionData, request);
      console.log('✅ Enhanced session created successfully');
    } catch (sessionError: any) {
      console.error('❌ Session creation error:', sessionError);
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
    
    console.log('✅ Enhanced login process completed successfully');
    return response;

  } catch (error: any) {
    console.error('❌ Unexpected login error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

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
  
  console.log(`🚨 Failed login attempt ${current.count}/${SECURITY_CONFIG.maxFailedAttempts} from ${ip}:`, reason, details);
}

function clearFailedAttempts(ip: string) {
  failedAttempts.delete(ip);
  console.log('✅ Cleared failed attempts for:', ip);
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

function validateLoginInput(email: string, password: string) {
  const errors: string[] = [];
  
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
    if (email.length > 255) {
      errors.push('Email is too long');
    }
  }
  
  if (password) {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password.length > 128) {
      errors.push('Password is too long');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
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