// src/app/api/memberships/route.ts - FIXED VERSION with correct validation
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
  durationInDays?: number;
  price?: number;
  currency?: string;
  classTypes?: string[];
  status?: string;
  displayOrder?: number;
  memberCount?: number;
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

// Updated validation function that matches our MembershipPlanFormData interface
function validateMembershipInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status, currency } = data;

  // Validate required fields
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  } else if (name.trim().length < 3) {
    errors.push('Name must be at least 3 characters long');
  } else if (name.trim().length > 100) {
    errors.push('Name must be less than 100 characters long');
  }

  // Description is optional but validate if provided
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
  }

  // Validate duration (should be one of our predefined values)
  const validDurations = ['1_month', '3_months', '6_months', '12_months', 'unlimited'];
  if (!duration || typeof duration !== 'string' || !validDurations.includes(duration)) {
    errors.push('Duration must be one of: 1_month, 3_months, 6_months, 12_months, unlimited');
  }

  // Validate price
  if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
    errors.push('Price is required and must be a positive number');
  } else if (price > 10000) {
    errors.push('Price must be less than $10,000');
  }

  // Validate class types
  if (!Array.isArray(classTypes) || classTypes.length === 0) {
    errors.push('At least one class type must be selected');
  } else {
    const validClassTypes = ['bjj', 'mma', 'muay_thai', 'boxing', 'general_fitness', 'all'];
    for (const type of classTypes) {
      if (typeof type !== 'string' || !validClassTypes.includes(type)) {
        errors.push('Invalid class type: ' + type);
        break;
      }
    }
  }

  // Validate status
  const validStatuses = ['active', 'inactive', 'archived'];
  if (status && !validStatuses.includes(status)) {
    errors.push('Status must be one of: active, inactive, archived');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Convert duration to days for storage
  const durationToDays: Record<string, number> = {
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
    'unlimited': 9999
  };

  const durationInDays = durationToDays[duration] || 30;

  // Sanitize and prepare data for storage
  const sanitizedData = {
    name: name.trim(),
    description: description?.trim() || '',
    duration: duration.trim(),
    durationInDays,
    price: Math.round(price * 100) / 100, // Round to 2 decimal places
    currency: currency?.trim() || 'USD',
    classTypes: classTypes.map((type: string) => type.trim()),
    status: status || 'active',
    displayOrder: 0,
    memberCount: 0,
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

    // Validate API access with admin or staff permissions
    const { success, session, error } = await validateAPIAccess(request, ['admin', 'staff']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    try {
      const url = new URL(request.url);
      const searchParams = url.searchParams;
      
      // Build query
      let query: Query<DocumentData> = adminDb.collection('membershipPlans') as Query<DocumentData>;

      // Apply filters
      const status = searchParams.get('status');
      if (status) {
        const statusArray = status.split(',').map(s => s.trim());
        query = query.where('status', 'in', statusArray);
      }

      const classTypes = searchParams.get('classTypes');
      if (classTypes) {
        const classTypesArray = classTypes.split(',').map(ct => ct.trim());
        query = query.where('classTypes', 'array-contains-any', classTypesArray);
      }

      const duration = searchParams.get('duration');
      if (duration) {
        const durationArray = duration.split(',').map(d => d.trim());
        query = query.where('duration', 'in', durationArray);
      }

      // Execute query with ordering
      query = query.orderBy('createdAt', 'desc');
      const snapshot = await query.get();

      const memberships: MembershipData[] = [];
      snapshot.forEach(doc => {
        memberships.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Apply text search on the client side (since Firestore doesn't support full-text search)
      const search = searchParams.get('search');
      let filteredMemberships = memberships;
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredMemberships = memberships.filter(membership =>
          membership.name?.toLowerCase().includes(searchLower) ||
          membership.description?.toLowerCase().includes(searchLower)
        );
      }

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(filteredMemberships),
        count: filteredMemberships.length
      }, { status: 200 });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to load membership plans' },
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

    // Only admins can create membership plans
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

  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return addSecurityHeaders(response);
}