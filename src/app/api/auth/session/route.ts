// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Session check requested');
    
    // Get session from request
    const session = await getSession(request);
    
    if (!session) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        { success: false, error: 'No valid session' },
        { status: 401 }
      );
    }

    if (!session.isActive) {
      console.log('❌ User account is inactive');
      return NextResponse.json(
        { success: false, error: 'Account is inactive' },
        { status: 403 }
      );
    }

    console.log('✅ Valid session found for user:', session.uid);
    
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

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Session check error:', error);
    
    return NextResponse.json(
      { success: false, error: 'Session check failed: ' + errorMessage },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}