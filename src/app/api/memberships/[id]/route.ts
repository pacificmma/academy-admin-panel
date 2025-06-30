// src/app/api/memberships/[id]/route.ts - Dynamic Route for UPDATE and DELETE
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/app/lib/firebase/admin';

// ============================================
// SHARED UTILITIES
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
// DYNAMIC ROUTE HANDLERS
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

    const user = await verifyAdminPermission(request);
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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
      // Check if membership exists
      const membershipDoc = await adminDb.collection('memberships').doc(membershipId).get();
      
      if (!membershipDoc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      const updateData = {
        ...validation.sanitizedData,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      };

      await adminDb.collection('memberships').doc(membershipId).update(updateData);

      const updatedMembership = {
        id: membershipId,
        ...membershipDoc.data(),
        ...updateData
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

// DELETE /api/memberships/[id] - Archive membership plan
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

    const user = await verifyAdminPermission(request);
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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
      const membershipDoc = await adminDb.collection('memberships').doc(membershipId).get();
      
      if (!membershipDoc.exists) {
        const response = NextResponse.json(
          { success: false, error: 'Membership plan not found' },
          { status: 404 }
        );
        return addSecurityHeaders(response);
      }

      // Check if membership is in use by active members
      const memberMembershipsSnapshot = await adminDb
        .collection('member-memberships')
        .where('membershipPlanId', '==', membershipId)
        .where('isActive', '==', true)
        .get();

      if (!memberMembershipsSnapshot.empty) {
        const response = NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete membership plan. It is currently in use by active members.' 
          },
          { status: 400 }
        );
        return addSecurityHeaders(response);
      }

      // Soft delete - mark as archived instead of actual deletion
      await adminDb.collection('memberships').doc(membershipId).update({
        status: 'archived',
        archivedAt: new Date().toISOString(),
        archivedBy: user.uid,
        updatedAt: new Date().toISOString()
      });

      const response = NextResponse.json({
        success: true,
        message: 'Membership plan archived successfully'
      });

      return addSecurityHeaders(response);

    } catch (dbError: any) {
      const response = NextResponse.json(
        { success: false, error: 'Failed to archive membership plan' },
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

    const user = await verifyAdminPermission(request);
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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
      const membershipDoc = await adminDb.collection('memberships').doc(membershipId).get();
      
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