// src/app/api/auth/session/route.ts - Session API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSessionActivity } from '@/app/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json(
        { success: false, session: null },
        { status: 401 }
      );
    }

    // Update session activity
    const updatedToken = await updateSessionActivity(session);
    
    const response = NextResponse.json({
      success: true,
      session: session
    });

    // Set updated token if refreshed
    if (updatedToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      response.cookies.set('session-token', updatedToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours in seconds
        path: '/',
      });
    }

    return response;

  } catch (error) {
    return NextResponse.json(
      { success: false, session: null, error: 'Session validation failed' },
      { status: 500 }
    );
  }
}