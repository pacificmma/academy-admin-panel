// src/app/lib/api/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession, validateApiSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { ApiResponse } from '@/app/types/api';

// Request handler type (what our internal handlers expect)
export type ApiHandler = (
  request: NextRequest,
  context: RequestContext // This context is what the internal handlers expect
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
  // Change to accurately reflect Next.js's params type for dynamic routes
  params?: { [key: string]: string | string[] }; 
}

// Middleware options
interface MiddlewareOptions {
  requiredRoles?: UserRole[];
  allowSelf?: boolean;
  selfField?: string;
}

// Main auth wrapper
export function withAuth(
  // The handler passed to withAuth now accepts our internal RequestContext
  handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>, 
  options: MiddlewareOptions = {}
) {
  // This returned function must conform to Next.js's route handler signature:
  // (request: NextRequest, context: { params: { [key: string]: string | string[] } }) => Promise<NextResponse>
  return async (request: NextRequest, nextjsRouteContext: { params: { [key: string]: string | string[] } }) => {
    try {
      // Validate session
      const session = await validateApiSession(request);

      // Check role permissions
      if (options.requiredRoles && !options.requiredRoles.includes(session.role)) {
        return createErrorResponse('Insufficient permissions', 403);
      }

      // Build our internal RequestContext object
      const internalContext: RequestContext = {
        session,
        params: nextjsRouteContext.params, // Use the params from Next.js's provided context
      };

      // Handle self-access for non-admin users
      if (options.allowSelf && session.role !== 'admin' && internalContext.params) {
        const selfField = options.selfField || 'uid';
        const resourceId = internalContext.params.id; // Access 'id' from params
        
        // Ensure that the session object has the 'selfField' key and it's comparable
        if (resourceId && String(session[selfField as keyof typeof session]) !== resourceId) { 
          return createErrorResponse('Access denied: can only access your own resources', 403);
        }
      }

      // Call the original handler with our custom internal context
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

// Role-specific wrappers (these remain the same, as they now wrap a conforming handler)
export const requireAdmin = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>) =>
  withAuth(handler, { requiredRoles: ['admin'] });

export const requireStaff = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>) =>
  withAuth(handler, { requiredRoles: ['admin', 'staff'] });

export const requireTrainer = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>) =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer'] });

export const requireStaffOrTrainer = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>) =>
  withAuth(handler, { requiredRoles: ['admin', 'staff', 'trainer'] });

// Self-access wrappers
export const requireSelfOrAdmin = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>, selfField = 'uid') =>
  withAuth(handler, { requiredRoles: ['admin', 'staff', 'trainer'], allowSelf: true, selfField });

export const requireAdminOrSelf = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>, selfField = 'uid') =>
  withAuth(handler, { requiredRoles: ['admin'], allowSelf: true, selfField });

// Trainer-specific: can only access assigned classes
export const requireTrainerAccess = (handler: (request: NextRequest, context: RequestContext) => Promise<NextResponse>) =>
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

// Validation helper
export function validateRequestBody<T>(
  request: NextRequest,
  schema: (body: any) => { isValid: boolean; errors: string[]; data?: T }
) {
  return async (): Promise<{ isValid: boolean; errors: string[]; data?: T }> => {
    try {
      const body = await request.json();
      return schema(body);
    } catch (error) {
      return {
        isValid: false,
        errors: ['Invalid JSON body'],
      };
    }
  };
}

// Pagination helper
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(request: NextRequest): PaginationParams {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// Search/filter helper
export function getSearchParams(request: NextRequest) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const sortBy = url.searchParams.get('sortBy') || 'createdAt';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
  
  // Get all filter parameters (anything that starts with 'filter_')
  const filters: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key.startsWith('filter_')) {
      const filterKey = key.replace('filter_', '');
      filters[filterKey] = value;
    }
  }

  return {
    search,
    sortBy,
    sortOrder,
    filters,
  };
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