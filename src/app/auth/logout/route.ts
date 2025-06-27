import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    // Create response with cleared session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the session cookie
    response.headers.set('Set-Cookie', clearSessionCookie());

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}