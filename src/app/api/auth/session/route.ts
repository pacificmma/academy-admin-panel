// src/app/api/auth/session/route.ts - ALTERNATİF VERSİYON
import { NextRequest } from 'next/server';
import { getSession, updateSessionActivity } from '@/app/lib/auth/session';
import { successResponse, errorResponse } from '@/app/lib/api/response-utils';

// Bu endpoint authentication gerektirmediği için özel handler
export async function GET(request: NextRequest, context?: any) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      return errorResponse('No active session', 401);
    }

    // Update session activity
    const updatedToken = await updateSessionActivity(session);
    
    const response = successResponse(session, 'Session retrieved successfully');

    // Set updated token if refreshed
    if (updatedToken) {
      const isProduction = process.env.NODE_ENV === 'production';
      response.cookies.set('session-token', updatedToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60,
        path: '/',
      });
    }

    return response;

  } catch (error) {
    return errorResponse('Session validation failed', 500);
  }
}