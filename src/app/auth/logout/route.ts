// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout request received');
    
    // Create response that redirects to login
    const response = NextResponse.redirect(new URL('/login', request.url));

    // Clear the session cookie
    response.headers.set('Set-Cookie', clearSessionCookie());
    
    console.log('✅ Session cookie cleared, redirecting to login');
    return response;

  } catch (error: unknown) {
    console.error('❌ Logout error:', error);
    
    // Even if there's an error, still redirect to login and clear cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Set-Cookie', clearSessionCookie());
    
    return response;
  }
}

// Handle GET requests too (for form actions)
export async function GET(request: NextRequest) {
  return POST(request);
}