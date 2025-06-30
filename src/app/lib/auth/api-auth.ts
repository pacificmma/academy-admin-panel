// src/app/lib/auth/api-auth.ts - UNIFIED API AUTHENTICATION UTILITY
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIAccess, SessionData } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';

// ============================================
// RATE LIMITING
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  return cfConnectingIp || xRealIp || xForwardedFor?.split(',')[0].trim() || 'unknown';
}

export function checkRateLimit(
  ip: string, 
  maxRequests = 50, 
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  let requestInfo = requestCounts.get(ip);
  
  if (!requestInfo || requestInfo.resetTime <= windowStart) {
    requestInfo = { count: 1, resetTime: now + windowMs };
    requestCounts.set(ip, requestInfo);
    return true;
  }
  
  if (requestInfo.count >= maxRequests) {
    return false;
  }
  
  requestInfo.count++;
  return true;
}

// ============================================
// SECURITY HEADERS
// ============================================

export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('Content-Security-Policy', "default-src 'self'");
  }
  
  return response;
}

// ============================================
// CORS HEADERS
// ============================================

export function addCorsHeaders(response: NextResponse): NextResponse {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400');
  
  return response;
}

// ============================================
// UNIFIED AUTHENTICATION
// ============================================

export interface ApiAuthResult {
  success: boolean;
  session?: SessionData;
  error?: NextResponse;
}

export interface ApiAuthOptions {
  requiredRoles?: UserRole[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  requireActiveUser?: boolean;
}

/**
 * Unified authentication for all API endpoints
 * This function handles rate limiting, authentication, and authorization
 */
export async function authenticateApiRequest(
  request: NextRequest,
  options: ApiAuthOptions = {}
): Promise<ApiAuthResult> {
  const {
    requiredRoles = [],
    rateLimit = { maxRequests: 100, windowMs: 15 * 60 * 1000 },
    requireActiveUser = true
  } = options;

  const clientIP = getClientIP(request);

  try {
    // 1. Rate limiting check
    if (!checkRateLimit(clientIP, rateLimit.maxRequests, rateLimit.windowMs)) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(rateLimit.windowMs / 1000)
        },
        { status: 429 }
      );
      
      response.headers.set('Retry-After', Math.ceil(rateLimit.windowMs / 1000).toString());
      
      return {
        success: false,
        error: addSecurityHeaders(addCorsHeaders(response))
      };
    }

    // 2. Authentication and Authorization
    const { success, session, error } = await validateAPIAccess(request, requiredRoles);
    
    if (!success) {
      const statusCode = error === 'Authentication required' ? 401 : 403;
      const response = NextResponse.json(
        { success: false, error },
        { status: statusCode }
      );
      
      return {
        success: false,
        error: addSecurityHeaders(addCorsHeaders(response))
      };
    }

    // 3. Additional active user check (if required)
    if (requireActiveUser && session && !session.isActive) {
      const response = NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      );
      
      return {
        success: false,
        error: addSecurityHeaders(addCorsHeaders(response))
      };
    }

    return {
      success: true,
      session: session!
    };

  } catch (error: any) {
    console.error('API authentication error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP,
      path: request.nextUrl.pathname,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    const response = NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? `Authentication error: ${error.message}` 
          : 'Authentication failed' 
      },
      { status: 500 }
    );
    
    return {
      success: false,
      error: addSecurityHeaders(addCorsHeaders(response))
    };
  }
}

// ============================================
// DATA SANITIZATION
// ============================================

export function sanitizeOutput(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized._internal;
    delete sanitized.secrets;
    delete sanitized.privateData;
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.resetToken;
    delete sanitized.verificationToken;
    
    return sanitized;
  }
  
  return data;
}

// ============================================
// REQUEST VALIDATION
// ============================================

export function validateJsonBody(request: NextRequest): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const body = await request.json();
      resolve(body);
    } catch (error) {
      reject(new Error('Invalid JSON format in request body'));
    }
  });
}

export function validateRequiredFields(data: any, requiredFields: string[]): string[] {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Field '${field}' is required`);
    }
  }
  
  return errors;
}

// ============================================
// PAGINATION HELPERS
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function extractPaginationParams(request: NextRequest): PaginationParams {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

export function createPaginationResponse(
  data: any[], 
  pagination: PaginationParams, 
  total: number
) {
  return {
    success: true,
    data: sanitizeOutput(data),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
      hasNext: pagination.page < Math.ceil(total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  };
}

// ============================================
// ERROR RESPONSE HELPERS
// ============================================

export function createErrorResponse(
  error: string, 
  statusCode: number = 400, 
  details?: any
): NextResponse {
  const response = NextResponse.json(
    { 
      success: false, 
      error,
      ...(details && { details })
    },
    { status: statusCode }
  );
  
  return addSecurityHeaders(addCorsHeaders(response));
}

export function createSuccessResponse(
  data: any, 
  message?: string, 
  statusCode: number = 200
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      data: sanitizeOutput(data),
      ...(message && { message })
    },
    { status: statusCode }
  );
  
  return addSecurityHeaders(addCorsHeaders(response));
}

// ============================================
// OPTIONS HANDLER
// ============================================

export function handleOptionsRequest(allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE']): NextResponse {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  const response = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': [...allowedMethods, 'OPTIONS'].join(', '),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}

// ============================================
// EXPORT DEFAULT INTERFACE
// ============================================

export default {
  authenticateApiRequest,
  addSecurityHeaders,
  addCorsHeaders,
  sanitizeOutput,
  validateJsonBody,
  validateRequiredFields,
  extractPaginationParams,
  createPaginationResponse,
  createErrorResponse,
  createSuccessResponse,
  handleOptionsRequest,
  getClientIP,
  checkRateLimit
};