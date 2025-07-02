// src/app/api/auth/logout/route.ts - FIXED FOR NEXT.JS 15 - OPTIMIZED
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth/session';
import { addSecurityHeaders } from '@/app/lib/auth/api-auth';

// POST /api/auth/logout - Logout user
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
    // Even if there's an error, still clear cookie
    const response = NextResponse.json(
      { success: true, message: 'Logged out' },
      { status: 200 }
    );
    clearSessionCookie(response);
    
    return addSecurityHeaders(response);
  }
}

// GET /api/auth/logout - Handle direct navigation
export async function GET(request: NextRequest) {
  try {
    // Clear session cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookie(response);
    return addSecurityHeaders(response);
  } catch (error: unknown) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookie(response);
    return addSecurityHeaders(response);
  }
}

// OPTIONS /api/auth/logout - Handle CORS preflight - FIXED FOR NEXT.JS 15
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