// src/app/api/auth/session/route.ts - SECURE SESSION API (FIXED)
import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionActivity, setSessionCookie } from '@/app/lib/auth/session';

// Rate limiting for session endpoint
const sessionRequests = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || real || 'unknown';
}

function checkSessionRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = process.env.NODE_ENV === 'production' ? 60 : 600; // 1 per 15 seconds in prod
  
  const windowStart = now - windowMs;
  let requestInfo = sessionRequests.get(ip);
  
  if (!requestInfo || requestInfo.resetTime <= windowStart) {
    sessionRequests.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (requestInfo.count >= maxRequests) {
    return false;
  }
  
  requestInfo.count++;
  return true;
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

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Rate limiting
    if (!checkSessionRateLimit(clientIP)) {
      const response = NextResponse.json(
        { success: false, error: 'Too many session requests' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // Get current session
    const session = await getSession(request);
    
    if (!session) {
      const response = NextResponse.json(
        { success: false, error: 'No valid session' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    if (!session.isActive) {
      const response = NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Update session activity and potentially refresh
    const updatedToken = await updateSessionActivity(session);
    
    const responseData = {
      success: true,
      session: {
        uid: session.uid,
        email: session.email,
        role: session.role,
        fullName: session.fullName,
        isActive: session.isActive,
      },
    };

    const response = NextResponse.json(responseData);

    // Set updated token if refreshed
    if (updatedToken) {
      setSessionCookie(response, updatedToken);
    }

    return addSecurityHeaders(response);

  } catch (error: unknown) {
    console.error('Session check error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP,
      timestamp: new Date().toISOString(),
    });
    
    const response = NextResponse.json(
      { success: false, error: 'Session validation failed' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Handle preflight requests with proper CORS
export async function OPTIONS() {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  const response = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}