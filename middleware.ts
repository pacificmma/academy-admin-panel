// src/app/lib/api/middleware.ts - Fixed API Middleware for Next.js 15
import { NextRequest, NextResponse } from 'next/server';
import { validateApiSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { ApiResponse } from '@/app/types/api';

// Internal request context for our handlers
export interface RequestContext {
  session: {
    uid: string;
    email: string;
    role: UserRole;
    fullName: string;
    isActive: boolean;
  };
  params?: { [key: string]: string | string[] };
}

// Next.js 15 API route context type
type NextJSRouteContext = {
  params: { [key: string]: string | string[] };
};

// Our internal handler type
export type ApiHandler = (
  request: NextRequest,
  context: RequestContext
) => Promise<NextResponse>;

// Next.js 15 compatible route handler type
export type NextJSRouteHandler = (
  request: NextRequest,
  context: NextJSRouteContext
) => Promise<NextResponse>;

// Middleware options
interface MiddlewareOptions {
  requiredRoles?: UserRole[];
  allowSelf?: boolean;
  selfField?: string;
}

// Main auth wrapper that returns a Next.js 15 compatible handler
export function withAuth(
  handler: ApiHandler,
  options: MiddlewareOptions = {}
): NextJSRouteHandler {
  return async (request: NextRequest, nextjsContext: NextJSRouteContext) => {
    try {
      // Validate session
      const session = await validateApiSession(request);

      // Check role permissions
      if (options.requiredRoles && !options.requiredRoles.includes(session.role)) {
        return createErrorResponse('Insufficient permissions', 403);
      }

      // Build our internal context
      const internalContext: RequestContext = {
        session,
        params: nextjsContext.params,
      };

      // Handle self-access for non-admin users
      if (options.allowSelf && session.role !== 'admin' && internalContext.params) {
        const selfField = options.selfField || 'uid';
        const resourceId = internalContext.params.id;
        
        if (resourceId && String(session[selfField as keyof typeof session]) !== String(resourceId)) {
          return createErrorResponse('Access denied: can only access your own resources', 403);
        }
      }

      // Call our handler with the internal context
      return await handler(request, internalContext);

    } catch (error: any) {
      if (error.message === 'No valid session found') {
        return createErrorResponse('Authentication required', 401);
      }
      
      if (error.message === 'User account is deactivated') {
        return createErrorResponse('Account deactivated', 403);
      }

      return createErrorResponse('Internal server error', 500);
    }
  };
}

// Role-specific wrappers
export const requireAdmin = (handler: ApiHandler): NextJSRouteHandler =>
  withAuth(handler, { requiredRoles: ['admin'] });

export const requireStaff = (handler: ApiHandler): NextJSRouteHandler =>
  withAuth(handler, { requiredRoles: ['admin', 'staff'] });

export const requireTrainer = (handler: ApiHandler): NextJSRouteHandler =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer'] });

export const requireStaffOrTrainer = (handler: ApiHandler): NextJSRouteHandler =>
  withAuth(handler, { requiredRoles: ['admin', 'staff', 'trainer'] });

// Self-access wrappers
export const requireSelfOrAdmin = (handler: ApiHandler, selfField = 'uid'): NextJSRouteHandler =>
  withAuth(handler, { requiredRoles: ['admin', 'staff', 'trainer'], allowSelf: true, selfField });

export const requireAdminOrSelf = (handler: ApiHandler, selfField = 'uid'): NextJSRouteHandler =>
  withAuth(handler, { requiredRoles: ['admin'], allowSelf: true, selfField });

// Trainer-specific: can only access assigned classes
export const requireTrainerAccess = (handler: ApiHandler): NextJSRouteHandler =>
  withAuth(async (request: NextRequest, context: RequestContext) => {
    const { session, params } = context;
    
    // Admin always has access
    if (session.role === 'admin') {
      return await handler(request, context);
    }
    
    // Trainer can only access assigned classes
    if (session.role === 'trainer' && params?.id) {
      // TODO: Check if trainer is assigned to this class
      // This will be implemented when we have the classes collection
    }
    
    return await handler(request, context);
  }, { requiredRoles: ['admin', 'trainer'] });

// Create standardized error responses
export function createErrorResponse(
  message: string,
  status: number = 400,
  code?: string
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: message,
  };

  if (code) {
    (response as any).code = code;
  }

  return NextResponse.json(response, { 
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Create standardized success responses
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    ...(data && { data }),
    ...(message && { message }),
  };

  return NextResponse.json(response, { 
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

// Handle method not allowed
export function createMethodNotAllowed(allowedMethods: string[]): NextResponse {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: 'Method not allowed',
    }),
    {
      status: 405,
      headers: {
        'Allow': allowedMethods.join(', '),
        'Content-Type': 'application/json',
      },
    }
  );
}

// CORS handler for OPTIONS requests
export function handleCorsOptions(): NextResponse {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}