// src/app/api/memberships/route.ts - FIXED WITH CONSISTENT AUTHENTICATION
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { validateAPIAccess } from '@/app/lib/auth/session';
import type { Query, CollectionReference, DocumentData } from 'firebase-admin/firestore';

// ============================================
// INTERFACES & TYPES
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

interface MembershipData {
  id: string;
  name?: string;
  description?: string;
  duration?: string;
  price?: number;
  classTypes?: string[];
  status?: string;
  [key: string]: any;
}

// ============================================
// SECURITY & VALIDATION
// ============================================

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  return xForwardedFor?.split(',')[0].trim() || 'unknown';
}

function checkRateLimit(ip: string, maxRequests = 50, windowMs = 15 * 60 * 1000): boolean {
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

function validateMembershipInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status } = data;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }

  if (!duration || typeof duration !== 'string' || duration.trim().length === 0) {
    errors.push('Duration is required and must be a non-empty string');
  }

  if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
    errors.push('Price is required and must be a positive number');
  }

  if (!Array.isArray(classTypes) || classTypes.length === 0) {
    errors.push('Class types are required and must be a non-empty array');
  }

  if (classTypes && Array.isArray(classTypes)) {
    for (const type of classTypes) {
      if (typeof type !== 'string' || type.trim().length === 0) {
        errors.push('All class types must be non-empty strings');
        break;
      }
    }
  }

  if (status && !['active', 'inactive', 'archived'].includes(status)) {
    errors.push('Status must be one of: active, inactive, archived');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Convert duration to days for consistency
  const durationLower = duration.toLowerCase();
  let durationDays = 0;
  
  if (durationLower.includes('month')) {
    const months = parseInt(durationLower.match(/\d+/)?.[0] || '0');
    durationDays = months * 30;
  } else if (durationLower.includes('year')) {
    const years = parseInt(durationLower.match(/\d+/)?.[0] || '0');
    durationDays = years * 365;
  } else if (durationLower.includes('day')) {
    durationDays = parseInt(durationLower.match(/\d+/)?.[0] || '0');
  } else {
    durationDays = 30; // Default to 30 days
  }

  const sanitizedData = {
    name: name.trim(),
    description: description.trim(),
    duration: duration.trim(),
    durationDays: durationDays,
    price: Math.round(price * 100) / 100,
    currency: 'USD',
    classTypes: classTypes.map((type: string) => type.trim()),
    status: status || 'active',
    displayOrder: 0,
  };

  return { isValid: true, errors: [], sanitizedData };
}

function sanitizeOutput(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = { ...data };
    delete sanitized._internal;
    delete sanitized.secrets;
    delete sanitized.privateData;
    return sanitized;
  }
  
  return data;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// ============================================
// API ENDPOINTS
// ============================================

// GET /api/memberships
export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    if (!checkRateLimit(clientIP, 100, 15 * 60 * 1000)) {
      const response = NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // FIXED: Use session-based authentication instead of Bearer token
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    const searchTerm = url.searchParams.get('search')?.trim();
    const statusFilter = url.searchParams.get('status');
    const sortBy = url.searchParams.get('sortBy') || 'createdAt';
    const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

    try {
      let query: Query<DocumentData> = adminDb.collection('membershipPlans');

      // Apply filters
      if (statusFilter && ['active', 'inactive', 'archived'].includes(statusFilter)) {
        query = query.where('status', '==', statusFilter);
      }

      // Apply sorting
      query = query.orderBy(sortBy, sortOrder);

      // Execute query
      const snapshot = await query.get();
      let memberships: MembershipData[] = [];

      snapshot.forEach(doc => {
        memberships.push({
          id: doc.id,
          ...doc.data()
        } as MembershipData);
      });

      // Apply search filter (client-side for now)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        memberships = memberships.filter(membership => 
          membership.name?.toLowerCase().includes(searchLower) ||
          membership.description?.toLowerCase().includes(searchLower) ||
          membership.classTypes?.some(type => type.toLowerCase().includes(searchLower))
        );
      }

      // Apply pagination
      const totalCount = memberships.length;
      const paginatedMemberships = memberships.slice(offset, offset + limit);

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(paginatedMemberships),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to fetch membership plans' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

  } catch (error: any) {
    const response = NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error' 
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// POST /api/memberships
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    if (!checkRateLimit(clientIP, 20, 15 * 60 * 1000)) {
      const response = NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // FIXED: Use session-based authentication instead of Bearer token
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      const response = NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    const validation = validateMembershipInput(body);
    if (!validation.isValid) {
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validation.errors 
        },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    try {
      const membershipData = {
        ...validation.sanitizedData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: session!.uid,
        memberCount: 0
      };

      const docRef = await adminDb.collection('membershipPlans').add(membershipData);

      const newMembership = {
        id: docRef.id,
        ...membershipData
      };

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(newMembership),
        message: 'Membership plan created successfully'
      }, { status: 201 });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to create membership plan' },
        { status: 500 }
      );
      return addSecurityHeaders(response);
    }

  } catch (error: any) {
    const response = NextResponse.json(
      { 
        success: false, 
        error: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'Internal server error' 
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  const response = new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}