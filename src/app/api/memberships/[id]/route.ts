// src/app/api/memberships/[id]/route.ts - FIXED WITH CONSISTENT AUTHENTICATION
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { validateAPIAccess } from '@/app/lib/auth/session';

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

function validateMembershipUpdate(data: any) {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status } = data;

  // Validate fields if they are provided
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    errors.push('Name must be a non-empty string');
  }

  if (description !== undefined && (typeof description !== 'string' || description.trim().length === 0)) {
    errors.push('Description must be a non-empty string');
  }

  if (duration !== undefined && (typeof duration !== 'string' || duration.trim().length === 0)) {
    errors.push('Duration must be a non-empty string');
  }

  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    errors.push('Price must be a positive number');
  }

  if (classTypes !== undefined && (!Array.isArray(classTypes) || classTypes.length === 0)) {
    errors.push('Class types must be a non-empty array');
  }

  if (classTypes && Array.isArray(classTypes)) {
    for (const type of classTypes) {
      if (typeof type !== 'string' || type.trim().length === 0) {
        errors.push('All class types must be non-empty strings');
        break;
      }
    }
  }

  if (status !== undefined && !['active', 'inactive', 'archived'].includes(status)) {
    errors.push('Status must be one of: active, inactive, archived');
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
      durationDays = 30;
    }
    
    sanitizedData.durationDays = durationDays;
  }
  
  if (price !== undefined) sanitizedData.price = Math.round(price * 100) / 100;
  if (classTypes !== undefined) sanitizedData.classTypes = classTypes.map((type: string) => type.trim());
  if (status !== undefined) sanitizedData.status = status;

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

// PUT /api/memberships/[id] - Update membership plan
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

    // FIXED: Use session-based authentication instead of Bearer token
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const membershipId = params.id;
    
    if (!membershipId) {
      const response = NextResponse.json(
        { success: false, error: 'Membership ID is required' },
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
      // Check if membership exists
      const membershipRef = adminDb.collection('membershipPlans').doc(membershipId);
      const membershipDoc = await membershipRef.get();
      
      if (!membershipDoc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      // Update the membership
      const updateData = {
        ...validation.sanitizedData,
        updatedAt: new Date().toISOString(),
        updatedBy: session!.uid
      };

      await membershipRef.update(updateData);

      // Get the updated membership
      const updatedDoc = await membershipRef.get();
      const updatedMembership = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(updatedMembership),
        message: 'Membership plan updated successfully'
      });

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

// DELETE /api/memberships/[id] - Delete membership plan
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

    // FIXED: Use session-based authentication instead of Bearer token
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const membershipId = params.id;
    
    if (!membershipId) {
      const response = NextResponse.json(
        { success: false, error: 'Membership ID is required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    try {
      // Check if membership exists
      const membershipRef = adminDb.collection('membershipPlans').doc(membershipId);
      const membershipDoc = await membershipRef.get();
      
      if (!membershipDoc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      // Check if membership has active members (optional safety check)
      const memberMemberships = await adminDb
        .collection('memberMemberships')
        .where('membershipPlanId', '==', membershipId)
        .where('status', '==', 'active')
        .get();

      if (!memberMemberships.empty) {
        const response = NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete membership plan with active members. Please transfer or cancel their memberships first.' 
          },
          { status: 409 }
        );
        return addSecurityHeaders(response);
      }

      // Delete the membership
      await membershipRef.delete();

      const response = NextResponse.json({
        success: true,
        message: 'Membership plan deleted successfully'
      });

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

// GET /api/memberships/[id] - Get single membership plan
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

    // FIXED: Use session-based authentication instead of Bearer token
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    
    if (!success) {
      const response = NextResponse.json(
        { success: false, error },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
      return addSecurityHeaders(response);
    }

    const membershipId = params.id;
    
    if (!membershipId) {
      const response = NextResponse.json(
        { success: false, error: 'Membership ID is required' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    try {
      const membershipDoc = await adminDb.collection('membershipPlans').doc(membershipId).get();
      
      if (!membershipDoc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      const membership = {
        id: membershipDoc.id,
        ...membershipDoc.data()
      };

      const response = NextResponse.json({
        success: true,
        data: sanitizeOutput(membership)
      });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to fetch membership plan' },
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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });

  return addSecurityHeaders(response);
}