import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        uid: session.uid,
        email: session.email,
        role: session.role,
        fullName: session.fullName,
        isActive: session.isActive,
      },
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: 'Failed to check session' },
      { status: 500 }
    );
  }
}