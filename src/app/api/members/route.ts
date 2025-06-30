// src/app/api/members/route.ts - Secure Members API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { withSecurity, handleError, sanitizeOutput, validatePagination } from '@/app/lib/security/api-security';
import { validateMemberInput } from '@/app/lib/security/validation';

// GET /api/members - List all members with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Apply security checks
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin', 'staff'],
      rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Validate pagination
    const { page, limit, offset } = validatePagination(request);

    // Extract query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.trim();
    const membershipStatus = url.searchParams.get('membershipStatus');
    const parentId = url.searchParams.get('parentId');

    try {
      // Build query
      let query = adminDb.collection('members');

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
      let members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply text search filter (client-side filtering for Firestore)
      if (search) {
        const searchLower = search.toLowerCase();
        members = members.filter(member => 
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
    // Apply security checks (only admins can create members)
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 30, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

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