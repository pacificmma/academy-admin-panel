// src/app/lib/api/middleware.ts - UPDATED FOR NEW ROLE SYSTEM
import { NextRequest, NextResponse } from 'next/server';
import { validateApiSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { ApiResponse } from '@/app/types/api';

// Request handler type
export type ApiHandler = (
  request: NextRequest,
  context: RequestContext
) => Promise<NextResponse>;

// Request context with user session
export interface RequestContext {
  session: {
    uid: string;
    email: string;
    role: UserRole;
    fullName: string;
    isActive: boolean;
  };
  params?: Record<string, string | string[]>;
}

// Middleware options
interface MiddlewareOptions {
  requiredRoles?: UserRole[];
  allowSelf?: boolean;
  selfField?: string;
}

// Main auth wrapper that handles Next.js 15 route patterns
export function withAuth(
  handler: ApiHandler,
  options: MiddlewareOptions = {}
) {
  return async (
    request: NextRequest, 
    routeContext?: { params?: Promise<{ [key: string]: string | string[] }> | { [key: string]: string | string[] } }
  ) => {
    try {
      // Enhanced error logging
      console.log(`[API] ${request.method} ${request.url}`);
      
      // Validate session with enhanced error handling
      let session;
      try {
        session = await validateApiSession(request);
        console.log(`[API] Session validated for user: ${session.email} (${session.role})`);
      } catch (authError: any) {
        console.error('[API] Session validation failed:', authError.message);
        return createErrorResponse('Authentication required', 401);
      }

      // Check if user account is active
      if (!session.isActive) {
        console.error(`[API] Inactive user attempted access: ${session.email}`);
        return createErrorResponse('Account is deactivated', 403);
      }

      // Check role permissions
      if (options.requiredRoles && !options.requiredRoles.includes(session.role)) {
        console.error(`[API] Insufficient permissions for ${session.email}: required ${options.requiredRoles}, has ${session.role}`);
        return createErrorResponse('Insufficient permissions', 403);
      }

      // Extract params - handle both Promise and direct params
      let params: { [key: string]: string | string[] } | undefined;
      if (routeContext?.params) {
        if (routeContext.params instanceof Promise) {
          params = await routeContext.params;
        } else {
          params = routeContext.params;
        }
      }

      // Build our internal context
      const internalContext: RequestContext = {
        session,
        params,
      };

      // Handle self-access for non-admin users
      if (options.allowSelf && session.role !== 'admin' && internalContext.params) {
        const selfField = options.selfField || 'uid';
        const resourceId = internalContext.params.id;
        
        if (resourceId && String(session[selfField as keyof typeof session]) !== String(resourceId)) {
          console.error(`[API] Self-access denied for ${session.email}: accessing ${resourceId}, own ID is ${session.uid}`);
          return createErrorResponse('Access denied: can only access your own resources', 403);
        }
      }

      // Call our handler with the internal context
      const result = await handler(request, internalContext);
      console.log(`[API] Request completed successfully for ${session.email}`);
      return result;

    } catch (error: any) {
      // Enhanced error logging
      console.error('[API] Middleware error:', {
        message: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        timestamp: new Date().toISOString()
      });

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

// Role-specific wrappers - UPDATED FOR NEW ROLE SYSTEM
export const requireAdmin = (handler: ApiHandler) =>
  withAuth(handler, { requiredRoles: ['admin'] });

export const requireTrainer = (handler: ApiHandler) =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer', 'visiting_trainer'] });

export const requireFullTrainer = (handler: ApiHandler) =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer'] });

export const requireStaffOrTrainer = (handler: ApiHandler) =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer', 'visiting_trainer'] });

// Self-access wrappers
export const requireSelfOrAdmin = (handler: ApiHandler, selfField = 'uid') =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer', 'visiting_trainer'], allowSelf: true, selfField });

export const requireAdminOrSelf = (handler: ApiHandler, selfField = 'uid') =>
  withAuth(handler, { requiredRoles: ['admin'], allowSelf: true, selfField });

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