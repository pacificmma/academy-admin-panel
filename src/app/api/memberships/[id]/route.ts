// src/app/api/memberships/[id]/route.ts - FIXED VERSION with correct validation
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { validateAPIAccess } from '@/app/lib/auth/session';

// ============================================
// SECURITY & VALIDATION
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

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

function validateMembershipUpdate(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status, currency } = data;

  // Validate fields if they are provided (all fields are optional for updates)
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      errors.push('Name must be a non-empty string');
    } else if (name.trim().length < 3) {
      errors.push('Name must be at least 3 characters long');
    } else if (name.trim().length > 100) {
      errors.push('Name must be less than 100 characters long');
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }
  }

  if (duration !== undefined) {
    const validDurations = ['1_month', '3_months', '6_months', '12_months', 'unlimited'];
    if (typeof duration !== 'string' || !validDurations.includes(duration)) {
      errors.push('Duration must be one of: 1_month, 3_months, 6_months, 12_months, unlimited');
    }
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      errors.push('Price must be a positive number');
    } else if (price > 10000) {
      errors.push('Price must be less than $10,000');
    }
  }

  if (classTypes !== undefined) {
    if (!Array.isArray(classTypes) || classTypes.length === 0) {
      errors.push('Class types must be a non-empty array');
    } else {
      const validClassTypes = ['bjj', 'mma', 'muay_thai', 'boxing', 'general_fitness', 'all'];
      for (const type of classTypes) {
        if (typeof type !== 'string' || !validClassTypes.includes(type)) {
          errors.push('Invalid class type: ' + type);
          break;
        }
      }
    }
  }

  if (status !== undefined) {
    const validStatuses = ['active', 'inactive', 'archived'];
    if (!validStatuses.includes(status)) {
      errors.push('Status must be one of: active, inactive, archived');
    }
  }

  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.trim().length === 0) {
      errors.push('Currency must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize the data
  const sanitizedData: any = {};
  
  if (name !== undefined) sanitizedData.name = name.trim();
  if (description !== undefined) sanitizedData.description = description.trim();
  if (duration !== undefined) {
    sanitizedData.duration = duration.trim();
    
    // Convert duration to days
    const durationToDays: Record<string, number> = {
      '1_month': 30,
      '3_months': 90,
      '6_months': 180,
      '12_months': 365,
      'unlimited': 9999
    };
    sanitizedData.durationInDays = durationToDays[duration] || 30;
  }
  if (price !== undefined) sanitizedData.price = Math.round(price * 100) / 100;
  if (currency !== undefined) sanitizedData.currency = currency.trim();
  if (classTypes !== undefined) sanitizedData.classTypes = classTypes.map((type: string) => type.trim());
  if (status !== undefined) sanitizedData.status = status;

  // Always update the updatedAt timestamp
  sanitizedData.updatedAt = new Date().toISOString();

  return { isValid: true, errors: [], sanitizedData };
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

// ============================================
// API ENDPOINTS
// ============================================

// GET /api/memberships/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientIP = getClientIP(request);

  try {
    if (!checkRateLimit(clientIP, 100, 15 * 60 * 1000)) {
      const response = NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    const { success, session, error } = await validateAPIAccess(request, ['admin', 'staff']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const { id } = params;

    if (!id || typeof id !== 'string') {
      const response = NextResponse.json(
        { success: false, error: 'Invalid membership plan ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    try {
      const docRef = adminDb.collection('membershipPlans').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      const membershipData = {
        id: doc.id,
        ...doc.data()
      };

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(membershipData)
      }, { status: 200 });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to load membership plan' },
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

// PUT /api/memberships/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientIP = getClientIP(request);

  try {
    if (!checkRateLimit(clientIP, 30, 15 * 60 * 1000)) {
      const response = NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // Only admins can update membership plans
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const { id } = params;

    if (!id || typeof id !== 'string') {
      const response = NextResponse.json(
        { success: false, error: 'Invalid membership plan ID' },
        { status: 400 }
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

    const validation = validateMembershipUpdate(body);
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
      // Check if membership plan exists
      const docRef = adminDb.collection('membershipPlans').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      // Update the document
      await docRef.update({
        ...validation.sanitizedData,
        lastModifiedBy: session!.uid,
      });

      // Fetch the updated document
      const updatedDoc = await docRef.get();
      const updatedMembership = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(updatedMembership),
        message: 'Membership plan updated successfully'
      }, { status: 200 });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to update membership plan' },
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

// DELETE /api/memberships/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientIP = getClientIP(request);

  try {
    if (!checkRateLimit(clientIP, 10, 15 * 60 * 1000)) {
      const response = NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
      return addSecurityHeaders(response);
    }

    // Only admins can delete membership plans
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const { id } = params;

    if (!id || typeof id !== 'string') {
      const response = NextResponse.json(
        { success: false, error: 'Invalid membership plan ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    try {
      // Check if membership plan exists
      const docRef = adminDb.collection('membershipPlans').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      // Check if any members are currently using this plan
      const memberMembershipsSnapshot = await adminDb
        .collection('memberMemberships')
        .where('membershipPlanId', '==', id)
        .where('isActive', '==', true)
        .get();

      if (!memberMembershipsSnapshot.empty) {
        const response = NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete membership plan. Active members are currently using this plan.',
            activeMembers: memberMembershipsSnapshot.size
          },
          { status: 409 }
        );
        return addSecurityHeaders(response);
      }

      // Delete the membership plan
      await docRef.delete();

      const response = NextResponse.json({
        success: true,
        message: 'Membership plan deleted successfully'
      }, { status: 200 });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to delete membership plan' },
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
  response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return addSecurityHeaders(response);
}