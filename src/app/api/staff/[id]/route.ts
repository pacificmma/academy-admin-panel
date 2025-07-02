// src/app/api/staff/[id]/route.ts - FIXED VERSION WITH PROPER TYPES
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaffOrTrainer, requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse, forbiddenResponse, conflictResponse } from '@/app/lib/api/response-utils';

// GET /api/staff/[id] - Get specific staff member
export const GET = requireStaffOrTrainer(async (request: NextRequest, context) => {
  try {
    const { params, session } = context;

    if (!params?.id) {
      return badRequestResponse('Staff ID is required');
    }

    const staffId = params.id as string;

    // Get staff document
    const staffDoc = await adminDb.collection('staff').doc(staffId).get();

    if (!staffDoc.exists) {
      return notFoundResponse('Staff member');
    }

    // Type the staff data properly
    const staffData: any = { id: staffDoc.id, ...staffDoc.data() };

    // Non-admin users can only view their own profile
    if (session.role !== 'admin' && session.uid !== staffId) {
      return forbiddenResponse('Access denied');
    }

    // Remove sensitive data if not admin
    if (session.role !== 'admin') {
      // Use optional deletion to avoid TypeScript errors
      if (staffData.lastLoginIP) delete staffData.lastLoginIP;
      if (staffData.failedLoginAttempts) delete staffData.failedLoginAttempts;
      if (staffData.accountLockoutUntil) delete staffData.accountLockoutUntil;
      if (staffData.lastFailedLoginAt) delete staffData.lastFailedLoginAt;
      if (staffData.securityFlags) delete staffData.securityFlags;
    }

    return successResponse(staffData);

  } catch (error: any) {
    return errorResponse('Failed to fetch staff member', 500);
  }
});

// PUT /api/staff/[id] - Update staff member
export const PUT = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { params, session } = context;

    if (!params?.id) {
      return badRequestResponse('Staff ID is required');
    }

    const staffId = params.id as string;
    const body = await request.json();

    // Check if staff exists
    const staffRef = adminDb.collection('staff').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists) {
      return notFoundResponse('Staff member');
    }

    // Check if email is already used by another staff member
    if (body.email && body.email !== staffDoc.data()?.email) {
      const existingStaff = await adminDb.collection('staff')
        .where('email', '==', body.email)
        .get();

      if (!existingStaff.empty && existingStaff.docs[0].id !== staffId) {
        return conflictResponse('Email already exists');
      }
    }

    // Update with audit fields
    const updateData: any = {
      ...body,
      updatedBy: session.uid,
      updatedAt: new Date(),
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await staffRef.update(updateData);

    // Get updated document
    const updatedDoc = await staffRef.get();
    const result: any = { id: updatedDoc.id, ...updatedDoc.data() };

    return successResponse(result, 'Staff member updated successfully');

  } catch (error: any) {
    return errorResponse('Failed to update staff member', 500);
  }
});

// DELETE /api/staff/[id] - Delete (deactivate) staff member
export const DELETE = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { params, session } = context;

    if (!params?.id) {
      return badRequestResponse('Staff ID is required');
    }

    const staffId = params.id as string;

    // Check if staff exists
    const staffRef = adminDb.collection('staff').doc(staffId);
    const staffDoc = await staffRef.get();

    if (!staffDoc.exists) {
      return notFoundResponse('Staff member');
    }

    // Prevent admin from deleting themselves
    if (staffId === session.uid) {
      return badRequestResponse('Cannot delete your own account');
    }

    // Soft delete (deactivate) instead of hard delete
    await staffRef.update({
      isActive: false,
      deactivatedBy: session.uid,
      deactivatedAt: new Date(),
      updatedBy: session.uid,
      updatedAt: new Date(),
    });

    return successResponse(null, 'Staff member deactivated successfully');

  } catch (error: any) {
    return errorResponse('Failed to deactivate staff member', 500);
  }
});