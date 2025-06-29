// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth/session';

export async function POST(request: NextRequest) {
  try {    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the session cookie
    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;

  } catch (error: unknown) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, still clear cookie
    const response = NextResponse.json(
      { success: true, message: 'Logged out' },
      { status: 200 }
    );
    response.headers.set('Set-Cookie', clearSessionCookie());
    
    return response;
  }
}

// Handle GET requests too (for direct navigation)
export async function GET(request: NextRequest) {
  try {
    // Clear session cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;
  } catch (error: unknown) {
    console.error('❌ Logout GET error:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Set-Cookie', clearSessionCookie());
    return response;
  }
}