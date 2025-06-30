// src/app/api/memberships/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/app/lib/firebase/admin';

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

async function verifyAdminPermission(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const staffDoc = await adminDb.collection('staff').doc(decodedToken.uid).get();
    
    if (!staffDoc.exists) {
      return null;
    }

    const staffData = staffDoc.data();
    
    if (staffData?.role !== 'admin' || !staffData?.isActive) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: staffData.role,
      email: staffData.email,
      fullName: staffData.fullName
    };
  } catch (error) {
    return null;
  }
}

function validateMembershipInput(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status } = data;

  // Name validation
  if (!name || typeof name !== 'string') {
    errors.push('Membership name is required');
  } else {
    if (name.trim().length < 2 || name.length > 100) {
      errors.push('Membership name must be between 2 and 100 characters');
    }
  }

  // Description validation
  if (description && typeof description === 'string' && description.length > 500) {
    errors.push('Description cannot exceed 500 characters');
  }

  // Duration validation
  const validDurations = ['1_month', '3_months', '6_months', '12_months', 'unlimited'];
  if (!duration || !validDurations.includes(duration)) {
    errors.push('Valid duration is required');
  }

  // Price validation
  if (typeof price !== 'number' || price < 0 || price > 10000) {
    errors.push('Price must be a positive number less than 10,000');
  }

  // Class types validation
  const validClassTypes = ['bjj', 'mma', 'muay_thai', 'boxing', 'general_fitness', 'all'];
  if (!Array.isArray(classTypes) || classTypes.length === 0) {
    errors.push('At least one class type must be selected');
  } else {
    const invalidTypes = classTypes.filter(type => !validClassTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push('Invalid class types detected');
    }
  }

  // Status validation
  const validStatuses = ['active', 'inactive', 'archived'];
  if (!status || !validStatuses.includes(status)) {
    errors.push('Valid status is required');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Calculate duration in days with proper typing
  const durationMap: Record<string, number> = {
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
    'unlimited': 999999
  };
  
  const durationDays = durationMap[duration as string] || 30;

  // Sanitize data
  const sanitizedData = {
    name: name.trim(),
    description: description?.trim() || '',
    duration,
    durationInDays: durationDays,
    price: Math.round(price * 100) / 100,
    currency: 'USD',
    classTypes: classTypes.map((type: string) => type.trim()),
    status,
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

    const user = await verifyAdminPermission(request);
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const search = url.searchParams.get('search')?.trim();
    const status = url.searchParams.get('status');

    try {
      let query = adminDb.collection('memberships');

      if (status && ['active', 'inactive', 'archived'].includes(status)) {
        query = query.where('status', '==', status);
      }

      const offset = (page - 1) * limit;
      query = query.orderBy('displayOrder', 'asc').orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      let memberships: MembershipData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MembershipData[];

      if (search) {
        const searchLower = search.toLowerCase();
        memberships = memberships.filter(membership => 
          membership.name?.toLowerCase().includes(searchLower) ||
          membership.description?.toLowerCase().includes(searchLower)
        );
      }

      const total = memberships.length;
      memberships = memberships.slice(offset, offset + limit);

      const sanitizedMemberships = sanitizeOutput(memberships);

      const response = NextResponse.json({
        success: true,
        data: sanitizedMemberships,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to fetch memberships' },
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

    const user = await verifyAdminPermission(request);
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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
        createdBy: user.uid,
        memberCount: 0
      };

      const docRef = await adminDb.collection('memberships').add(membershipData);

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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}