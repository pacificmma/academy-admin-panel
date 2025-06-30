// src/app/api/members/[id]/route.ts - Secure Member ID API
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

function validateMemberInput(data: any): { isValid: boolean; errors: string[]; sanitizedData?: any } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { email, firstName, lastName, phone, dateOfBirth, emergencyContact, martialArtsLevel, parentId } = data;

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
  };

  return { isValid: true, errors: [], sanitizedData };
}

function getDocumentIdFromPath(request: NextRequest): string | null {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  return segments[segments.length - 1] || null;
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

// GET /api/members/[id] - Get specific member
export async function GET(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 200, 15 * 60 * 1000)) {
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

    // Extract member ID from URL
    const memberId = getDocumentIdFromPath(request);
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get member document
      const memberDoc = await adminDb.collection('members').doc(memberId).get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // FIXED: Properly type memberData with any to allow dynamic properties
      let memberData: any = { id: memberDoc.id, ...memberDoc.data() };

      // If member has parent, include parent info
      if (memberData.parentId) {
        try {
          const parentDoc = await adminDb.collection('members').doc(memberData.parentId).get();
          if (parentDoc.exists) {
            const parentData = parentDoc.data();
            memberData.parentInfo = {
              id: parentDoc.id,
              firstName: parentData?.firstName,
              lastName: parentData?.lastName,
              email: parentData?.email
            };
          }
        } catch (parentError) {
          // Parent info is optional, continue without it
        }
      }

      // If member is a parent, include children info
      try {
        const childrenSnapshot = await adminDb.collection('members')
          .where('parentId', '==', memberId)
          .get();
        
        if (!childrenSnapshot.empty) {
          memberData.children = childrenSnapshot.docs.map(doc => {
            const childData = doc.data();
            return {
              id: doc.id,
              firstName: childData.firstName,
              lastName: childData.lastName,
              email: childData.email,
              membershipStatus: childData.membershipStatus
            };
          });
        }
      } catch (childrenError) {
        // Children info is optional, continue without it
      }

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(memberData)
      });

    } catch (dbError: any) {
      throw new Error('Failed to fetch member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// PUT /api/members/[id] - Update member
export async function PUT(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 50, 15 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Security check - only admins can update
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract member ID from URL
    const memberId = getDocumentIdFromPath(request);
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
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
      // Check if member exists
      const memberRef = adminDb.collection('members').doc(memberId);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // Check if email is already used by another member
      if (sanitizedData.email !== memberDoc.data()?.email) {
        const existingMember = await adminDb.collection('members')
          .where('email', '==', sanitizedData.email)
          .get();

        if (!existingMember.empty && existingMember.docs[0].id !== memberId) {
          return NextResponse.json(
            { success: false, error: 'Email already exists' },
            { status: 409 }
          );
        }
      }

      // If parentId is being changed, verify new parent exists
      if (sanitizedData.parentId && sanitizedData.parentId !== memberDoc.data()?.parentId) {
        // Check for circular reference (member can't be their own parent)
        if (sanitizedData.parentId === memberId) {
          return NextResponse.json(
            { success: false, error: 'Member cannot be their own parent' },
            { status: 400 }
          );
        }

        const parentDoc = await adminDb.collection('members').doc(sanitizedData.parentId).get();
        if (!parentDoc.exists) {
          return NextResponse.json(
            { success: false, error: 'Parent member not found' },
            { status: 400 }
          );
        }

        // Check if the new parent is actually a child of this member (prevent cycles)
        const parentData = parentDoc.data();
        if (parentData?.parentId === memberId) {
          return NextResponse.json(
            { success: false, error: 'Cannot create circular parent-child relationship' },
            { status: 400 }
          );
        }
      }

      // Update with audit fields
      const updateData = {
        ...sanitizedData,
        updatedBy: session!.uid,
        updatedAt: new Date(),
      };

      await memberRef.update(updateData);

      // Get updated document
      const updatedDoc = await memberRef.get();
      const result = { id: updatedDoc.id, ...updatedDoc.data() };

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(result)
      });

    } catch (dbError: any) {
      throw new Error('Failed to update member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// DELETE /api/members/[id] - Delete (deactivate) member
export async function DELETE(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    
    // Rate limiting
    if (!checkRateLimit(clientIP, 20, 15 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Security check - only admins can delete
    const { success, session, error } = await validateAPIAccess(request, ['admin']);
    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Extract member ID from URL
    const memberId = getDocumentIdFromPath(request);
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if member exists
      const memberRef = adminDb.collection('members').doc(memberId);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // Check if member has children - warn about orphaning
      const childrenSnapshot = await adminDb.collection('members')
        .where('parentId', '==', memberId)
        .get();

      if (!childrenSnapshot.empty) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete member with children. Please reassign children first or use force=true parameter.',
            children: childrenSnapshot.docs.map(doc => ({
              id: doc.id,
              name: `${doc.data().firstName} ${doc.data().lastName}`
            }))
          },
          { status: 400 }
        );
      }

      // Soft delete (deactivate) instead of hard delete
      await memberRef.update({
        membershipStatus: 'deleted',
        isActive: false,
        deletedBy: session!.uid,
        deletedAt: new Date(),
        updatedBy: session!.uid,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Member deleted successfully'
      });

    } catch (dbError: any) {
      throw new Error('Failed to delete member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}