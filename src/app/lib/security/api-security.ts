// src/app/lib/security/api-security.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAPIAccess } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';

// Input validation interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

// Rate limiting in-memory store (production'da Redis kullanın)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Security utilities
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || real || 'unknown';
}

export function checkRateLimit(ip: string, maxRequests = 100, windowMs = 15 * 60 * 1000): boolean {
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

export function sanitizeOutput(data: any): any {
  // Remove sensitive fields from output
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.privateKey;
    delete sanitized.secrets;
    delete sanitized._internal;
    delete sanitized.hashedPassword;
    delete sanitized.saltRounds;
    
    return sanitized;
  }
  
  return data;
}

// Secure error handler
export function handleError(error: any, includeStack = false): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: isDevelopment ? error.message : 'An error occurred',
    ...(isDevelopment && includeStack && { stack: error.stack }),
    timestamp: new Date().toISOString(),
  };
  
  return NextResponse.json(errorResponse, { status: 500 });
}

// Common security wrapper for API routes
export async function withSecurity(
  request: NextRequest,
  options: {
    requiredRoles?: UserRole[];
    rateLimit?: { maxRequests: number; windowMs: number };
  } = {}
) {
  const { requiredRoles = [], rateLimit = { maxRequests: 100, windowMs: 15 * 60 * 1000 } } = options;

  // 1. Rate limiting
  const clientIP = getClientIP(request);
  if (!checkRateLimit(clientIP, rateLimit.maxRequests, rateLimit.windowMs)) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      )
    };
  }

  // 2. Authentication & Authorization
  const { success, session, error } = await validateAPIAccess(request, requiredRoles);
  
  if (!success) {
    return {
      error: NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      )
    };
  }

  return { session, error: null };
}

// Extract document ID from URL path
export function getDocumentIdFromPath(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const documentId = pathSegments[pathSegments.length - 1];
  
  if (!documentId || documentId === 'undefined' || documentId === 'route') {
    return null;
  }
  
  return documentId;
}

// Validate pagination parameters
export function validatePagination(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  
  return { page, limit, offset: (page - 1) * limit };
}