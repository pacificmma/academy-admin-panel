// src/app/api/staff/route.ts - Secure Staff API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { withSecurity, handleError, sanitizeOutput, validatePagination } from '@/app/lib/security/api-security';
import { validateStaffInput } from '@/app/lib/security/validation';

// GET /api/staff - List all staff with pagination and filtering
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
    const role = url.searchParams.get('role');
    const isActive = url.searchParams.get('isActive');

    try {
      // Build query
      let query = adminDb.collection('staff');

      // Apply filters
      if (role && ['admin', 'trainer', 'staff'].includes(role)) {
        query = query.where('role', '==', role);
      }

      if (isActive !== null && (isActive === 'true' || isActive === 'false')) {
        query = query.where('isActive', '==', isActive === 'true');
      }

      // Apply ordering and pagination
      query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

      const snapshot = await query.get();
      let staff = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply text search filter (client-side filtering for Firestore)
      if (search) {
        const searchLower = search.toLowerCase();
        staff = staff.filter(member => 
          member.fullName?.toLowerCase().includes(searchLower) ||
          member.email?.toLowerCase().includes(searchLower)
        );
      }

      // Get total count for pagination
      const totalSnapshot = await adminDb.collection('staff').get();
      const total = totalSnapshot.size;

      // Sanitize output
      const sanitizedStaff = sanitizeOutput(staff);

      return NextResponse.json({
        success: true,
        data: sanitizedStaff,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (dbError: any) {
      throw new Error('Failed to fetch staff members');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// POST /api/staff - Create new staff member
export async function POST(request: NextRequest) {
  try {
    // Apply security checks (only admins can create staff)
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 }
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

    const validation = validateStaffInput(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    const { sanitizedData } = validation;

    try {
      // Check if email already exists
      const existingStaff = await adminDb.collection('staff')
        .where('email', '==', sanitizedData.email)
        .get();

      if (!existingStaff.empty) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 409 }
        );
      }

      // Add audit fields
      const staffData = {
        ...sanitizedData,
        createdBy: session!.uid,
        createdAt: new Date(),
        updatedBy: session!.uid,
        updatedAt: new Date(),
      };

      // Create staff document
      const docRef = await adminDb.collection('staff').add(staffData);
      const result = { id: docRef.id, ...staffData };

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(result)
      }, { status: 201 });

    } catch (dbError: any) {
      throw new Error('Failed to create staff member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}