// src/app/api/auth/logout/route.ts - SECURE LOGOUT API (FIXED)
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth/session';

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

export async function POST(request: NextRequest) {
  try {    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the session cookie
    clearSessionCookie(response);
    
    return addSecurityHeaders(response);

  } catch (error: unknown) {    
    console.error('Logout error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    // Even if there's an error, still clear cookie
    const response = NextResponse.json(
      { success: true, message: 'Logged out' },
      { status: 200 }
    );
    clearSessionCookie(response);
    
    return addSecurityHeaders(response);
  }
}

// Handle GET requests too (for direct navigation)
export async function GET(request: NextRequest) {
  try {
    // Clear session cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookie(response);
    return addSecurityHeaders(response);
  } catch (error: unknown) {
    console.error('Logout redirect error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookie(response);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}