// src/app/api/members/route.ts - Secure Members API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/app/lib/firebase/admin';
import { validateAPIAccess } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  return xForwardedFor?.split(',')[0].trim() || 'unknown';
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests = 100, windowMs = 15 * 60 * 1000): boolean {
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

function sanitizeOutput(data: any): any {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeOutput(item));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = { ...data };
    delete sanitized._internal;
    delete sanitized.secrets;
    delete sanitized.privateData;
    delete sanitized.password;
    return sanitized;
  }
  
  return data;
}

function validatePagination(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

function validateMemberInput(data: any): { isValid: boolean; errors: string[]; sanitizedData?: any } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { 
    email, firstName, lastName, phone, dateOfBirth, 
    emergencyContact, martialArtsLevel, parentId 
  } = data;

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Valid email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    }
  }

  // Name validation
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 1) {
    errors.push('First name is required');
  }
  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 1) {
    errors.push('Last name is required');
  }

  // Phone validation (optional)
  if (phone && typeof phone === 'string') {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.push('Please enter a valid phone number');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize data
  const sanitizedData = {
    email: email.toLowerCase().trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone?.trim() || '',
    dateOfBirth: dateOfBirth || '',
    emergencyContact: emergencyContact || {},
    martialArtsLevel: martialArtsLevel || {},
    parentId: parentId?.trim() || null,
    isActive: true,
  };

  return { isValid: true, errors: [], sanitizedData };
}

function handleError(error: any): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    success: false,
    error: isDevelopment ? error.message : 'An error occurred',
    timestamp: new Date().toISOString(),
  };
  
  return NextResponse.json(errorResponse, { status: 500 });
}

// ============================================
// API ENDPOINTS
// ============================================

// GET /api/members - List all members with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 100, 15 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Security check
    const { success, session, error } = await validateAPIAccess(request, ['admin', 'staff']);
    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate pagination
    const { page, limit, offset } = validatePagination(request);

    // Extract query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim();
    const membershipStatus = url.searchParams.get('membershipStatus');
    const parentId = url.searchParams.get('parentId');

    try {
      // Build query - FIXED: Proper type handling
      let query: any = adminDb.collection('members');

      // Apply filters
      if (membershipStatus && ['active', 'inactive', 'expired'].includes(membershipStatus)) {
        query = query.where('membershipStatus', '==', membershipStatus);
      }

      if (parentId) {
        query = query.where('parentId', '==', parentId);
      }

      // Apply ordering and pagination
      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      let members = snapshot.docs.map((doc: { id: any; data: () => any; }) => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply text search filter (client-side filtering for Firestore)
      if (search) {
        const searchLower = search.toLowerCase();
        members = members.filter((member: { firstName: string; lastName: string; email: string; }) => 
          member.firstName?.toLowerCase().includes(searchLower) ||
          member.lastName?.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower)
        );
      }

      // Get total count for pagination
      const totalSnapshot = await adminDb.collection('members').get();
      const total = totalSnapshot.size;

      // Sanitize output
      const sanitizedMembers = sanitizeOutput(members);

      return NextResponse.json({
        success: true,
        data: sanitizedMembers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (dbError: any) {
      throw new Error('Failed to fetch members');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// POST /api/members - Create new member
export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 30, 15 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Security check - only admins can create members
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    const validation = validateMemberInput(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    const { sanitizedData } = validation;

    try {
      // Check if email already exists
      const existingMember = await adminDb.collection('members')
        .where('email', '==', sanitizedData.email)
        .get();

      if (!existingMember.empty) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }

      // If parentId is provided, verify parent exists
      if (sanitizedData.parentId) {
        const parentDoc = await adminDb.collection('members').doc(sanitizedData.parentId).get();
        if (!parentDoc.exists) {
          return NextResponse.json(
            { success: false, error: 'Parent member not found' },
            { status: 400 }
          );
        }
      }

      // Add audit fields
      const memberData = {
        ...sanitizedData,
        membershipStatus: 'inactive', // Default status
        createdBy: session!.uid,
        createdAt: new Date(),
        updatedBy: session!.uid,
        updatedAt: new Date(),
      };

      // Create member document
      const docRef = await adminDb.collection('members').add(memberData);
      const result = { id: docRef.id, ...memberData };

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(result)
      }, { status: 201 });

    } catch (dbError: any) {
      throw new Error('Failed to create member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}