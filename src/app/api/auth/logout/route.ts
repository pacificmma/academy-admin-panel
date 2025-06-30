// src/app/api/auth/logout/route.ts - SECURE LOGOUT API (FIXED)
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth/session';

export async function POST(request: NextRequest) {
  try {    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the session cookie - FIXED: Pass response object
    clearSessionCookie(response);
    return response;

  } catch (error: unknown) {    
    // Even if there's an error, still clear cookie
    const response = NextResponse.json(
      { success: true, message: 'Logged out' },
      { status: 200 }
    );
    clearSessionCookie(response);
    
    return response;
  }
}

// Handle GET requests too (for direct navigation)
export async function GET(request: NextRequest) {
  try {
    // Clear session cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookie(response);
    return response;
  } catch (error: unknown) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    clearSessionCookie(response);
    return response;
  }
}