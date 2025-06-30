// src/app/api/staff/[id]/route.ts - Secure Staff ID API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { withSecurity, handleError, sanitizeOutput, getDocumentIdFromPath } from '@/app/lib/security/api-security';
import { validateStaffInput } from '@/app/lib/security/validation';

// GET /api/staff/[id] - Get specific staff member
export async function GET(request: NextRequest) {
  try {
    // Apply security checks
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin', 'staff'],
      rateLimit: { maxRequests: 200, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Extract staff ID from URL
    const staffId = getDocumentIdFromPath(request);
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get staff document
      const staffDoc = await adminDb.collection('staff').doc(staffId).get();

      if (!staffDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Staff member not found' },
          { status: 404 }
        );
      }

      const staffData = { id: staffDoc.id, ...staffDoc.data() };

      // Non-admin users can only view their own profile
      if (session!.role !== 'admin' && session!.uid !== staffId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(staffData)
      });

    } catch (dbError: any) {
      throw new Error('Failed to fetch staff member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// PUT /api/staff/[id] - Update staff member
export async function PUT(request: NextRequest) {
  try {
    // Apply security checks
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Extract staff ID from URL
    const staffId = getDocumentIdFromPath(request);
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
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

    const validation = validateStaffInput(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    const { sanitizedData } = validation;

    try {
      // Check if staff exists
      const staffRef = adminDb.collection('staff').doc(staffId);
      const staffDoc = await staffRef.get();

      if (!staffDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Staff member not found' },
          { status: 404 }
        );
      }

      // Check if email is already used by another staff member
      if (sanitizedData.email !== staffDoc.data()?.email) {
        const existingStaff = await adminDb.collection('staff')
          .where('email', '==', sanitizedData.email)
          .get();

        if (!existingStaff.empty && existingStaff.docs[0].id !== staffId) {
          return NextResponse.json(
            { success: false, error: 'Email already exists' },
            { status: 409 }
          );
        }
      }

      // Update with audit fields
      const updateData = {
        ...sanitizedData,
        updatedBy: session!.uid,
        updatedAt: new Date(),
      };

      await staffRef.update(updateData);

      // Get updated document
      const updatedDoc = await staffRef.get();
      const result = { id: updatedDoc.id, ...updatedDoc.data() };

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(result)
      });

    } catch (dbError: any) {
      throw new Error('Failed to update staff member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// DELETE /api/staff/[id] - Delete (deactivate) staff member
export async function DELETE(request: NextRequest) {
  try {
    // Apply security checks (only admins can delete)
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Extract staff ID from URL
    const staffId = getDocumentIdFromPath(request);
    if (!staffId) {
      return NextResponse.json(
        { success: false, error: 'Staff ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if staff exists
      const staffRef = adminDb.collection('staff').doc(staffId);
      const staffDoc = await staffRef.get();

      if (!staffDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Staff member not found' },
          { status: 404 }
        );
      }

      // Prevent admin from deleting themselves
      if (staffId === session!.uid) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete your own account' },
          { status: 400 }
        );
      }

      // Soft delete (deactivate) instead of hard delete
      await staffRef.update({
        isActive: false,
        deactivatedBy: session!.uid,
        deactivatedAt: new Date(),
        updatedBy: session!.uid,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Staff member deactivated successfully'
      });

    } catch (dbError: any) {
      throw new Error('Failed to deactivate staff member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}