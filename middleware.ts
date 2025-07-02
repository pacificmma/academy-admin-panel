// src/app/lib/api/middleware.ts - API Middleware Pattern
import { NextRequest, NextResponse } from 'next/server';
import { validateApiSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { ApiResponse } from '@/app/types/api';

// Request handler type for functions that will be wrapped by withAuth
// This is the type that developers will use for their route handlers (e.g., in route.ts files)
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
  // Changed to explicitly match Next.js's params structure for dynamic routes
  params?: { [key: string]: string | string[] };
}

// Middleware options
interface MiddlewareOptions {
  requiredRoles?: UserRole[];
  allowSelf?: boolean; // Allow users to access their own resources
  selfField?: string; // Field to check for self access (default: 'uid')
}

// This type defines the expected signature for a Next.js App Router API route export (e.g., GET, POST)
// This is the type that withAuth must return to satisfy Next.js's build process.
type RouteHandlerExport = (
  request: NextRequest,
  nextjsContext: { params: { [key: string]: string | string[] } }
) => Promise<NextResponse>;


// Main auth wrapper
export function withAuth(
  // The 'wrappedHandler' is the function written by the developer for the route.ts file,
  // expecting our custom 'RequestContext'.
  wrappedHandler: ApiHandler, // Using ApiHandler here as it's the expected input type for handlers
  options: MiddlewareOptions = {}
): RouteHandlerExport { // Explicitly state that withAuth returns a RouteHandlerExport
  // This returned function is what Next.js sees as the exported POST/GET/etc.
  return async (request: NextRequest, nextjsContext: { params: { [key: string]: string | string[] } }) => {
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
        params: nextjsContext.params, // Use the params from Next.js's provided context
      };

      // Handle self-access for non-admin users
      if (options.allowSelf && session.role !== 'admin' && internalContext.params) {
        const selfField = options.selfField || 'uid';
        const resourceId = internalContext.params.id; // Access 'id' from params
        
        // This cast might be necessary depending on the exact SessionData definition
        // Assuming SessionData includes `uid` as a string.
        if (resourceId && String(session[selfField as keyof typeof session]) !== resourceId) { 
          return createErrorResponse('Access denied: can only access your own resources', 403);
        }
      }

      // Call the original developer-provided handler with our custom internal context
      return await wrappedHandler(request, internalContext);

    } catch (error: any) {
      if (error.message === 'No valid session found') {
        return createErrorResponse('Authentication required', 401);
      }
      if (error.message === 'User account is deactivated') {
        return createErrorResponse('Account deactivated', 403);
      }
      console.error("Auth middleware error:", error); // Log for debugging
      return createErrorResponse('Internal server error', 500);
    }
  };
}

// Role-specific wrappers (their input handler type is ApiHandler, and return type is RouteHandlerExport)
export const requireAdmin = (handler: ApiHandler): RouteHandlerExport =>
  withAuth(handler, { requiredRoles: ['admin'] });

export const requireStaff = (handler: ApiHandler): RouteHandlerExport =>
  withAuth(handler, { requiredRoles: ['admin', 'staff'] });

export const requireTrainer = (handler: ApiHandler): RouteHandlerExport =>
  withAuth(handler, { requiredRoles: ['admin', 'trainer'] });

export const requireStaffOrTrainer = (handler: ApiHandler): RouteHandlerExport =>
  withAuth(handler, { requiredRoles: ['admin', 'staff', 'trainer'] });

// Self-access wrappers
export const requireSelfOrAdmin = (
  handler: ApiHandler, 
  selfField = 'uid'
): RouteHandlerExport =>
  withAuth(handler, { requiredRoles: ['admin', 'staff', 'trainer'], allowSelf: true, selfField });

export const requireAdminOrSelf = (
  handler: ApiHandler, 
  selfField = 'uid'
): RouteHandlerExport =>
  withAuth(handler, { requiredRoles: ['admin'], allowSelf: true, selfField });

// Trainer-specific: can only access assigned classes
export const requireTrainerAccess = (handler: ApiHandler): RouteHandlerExport =>
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

// Example usage wrapper that combines multiple patterns - This function is likely unused or a leftover.
// It's not directly related to the POST error from requireAdmin.
export function createApiRoute(handlers: {
  GET?: ApiHandler;
  POST?: ApiHandler;
  PUT?: ApiHandler;
  DELETE?: ApiHandler;
  PATCH?: ApiHandler;
}) {
  return async (request: NextRequest, params?: any) => {
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return handleCorsOptions();
    }

    // Get the appropriate handler
    const handler = handlers[method as keyof typeof handlers];
    
    if (!handler) {
      const allowedMethods = Object.keys(handlers).filter(m => m !== 'OPTIONS');
      return createMethodNotAllowed(allowedMethods);
    }

    return await handler(request, params);
  };
}