// src/app/api/members/[id]/route.ts - Individual member operations
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { 
  successResponse, 
  errorResponse, 
  notFoundResponse, 
  badRequestResponse 
} from '@/app/lib/api/response-utils';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { MemberRecord } from '@/app/types/member';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for updating members
const updateMemberSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  phoneNumber: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    relationship: z.string().min(1, 'Emergency contact relationship is required'),
  }).optional(),
  awards: z.array(z.object({
    title: z.string().min(1, 'Award title is required'),
    awardedDate: z.string().min(1, 'Award date is required'),
  })).optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/members/[id] - Get specific member
export const GET = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Member');
  }

  try {
    const memberDoc = await adminDb.collection('members').doc(params.id).get();
    
    if (!memberDoc.exists) {
      return notFoundResponse('Member');
    }

    const data = memberDoc.data();
    const member: MemberRecord = {
      id: memberDoc.id,
      uid: data?.uid,
      email: data?.email,
      fullName: data?.fullName,
      address: data?.address || undefined,
      phoneNumber: data?.phoneNumber || undefined,
      emergencyContact: data?.emergencyContact,
      awards: data?.awards || [],
      parentId: data?.parentId || undefined,
      isActive: data?.isActive,
      role: 'member',
      classRegistrations: data?.classRegistrations || [],
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data?.createdBy,
      updatedBy: data?.updatedBy,
    };

    return successResponse(member);
  } catch (err) {
    return errorResponse('Failed to fetch member', 500);
  }
});

// PUT /api/members/[id] - Update member
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params, session } = context;
  if (!params?.id) {
    return notFoundResponse('Member');
  }

  try {
    const body = await request.json();
    const validation = updateMemberSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { 
        validationErrors: validation.error.issues 
      });
    }

    const updateData = validation.data;

    // Check if member exists
    const memberDoc = await adminDb.collection('members').doc(params.id).get();
    
    if (!memberDoc.exists) {
      return notFoundResponse('Member');
    }

    // If parentId is provided, verify the parent exists and is not the member itself
    if (updateData.parentId) {
      if (updateData.parentId === params.id) {
        return badRequestResponse('Member cannot be their own parent');
      }
      
      const parentDoc = await adminDb.collection('members').doc(updateData.parentId).get();
      if (!parentDoc.exists) {
        return badRequestResponse('Parent member not found');
      }
    }

    // Update the member
    const updatedData = {
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    await adminDb.collection('members').doc(params.id).update(updatedData);
    
    // Get the updated member
    const updatedDoc = await adminDb.collection('members').doc(params.id).get();
    const data = updatedDoc.data();
    
    const updatedMember: MemberRecord = {
      id: updatedDoc.id,
      uid: data?.uid,
      email: data?.email,
      fullName: data?.fullName,
      address: data?.address || undefined,
      phoneNumber: data?.phoneNumber || undefined,
      emergencyContact: data?.emergencyContact,
      awards: data?.awards || [],
      parentId: data?.parentId || undefined,
      isActive: data?.isActive,
      role: 'member',
      classRegistrations: data?.classRegistrations || [],
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data?.createdBy,
      updatedBy: data?.updatedBy,
    };

    return successResponse(updatedMember, 'Member updated successfully');
  } catch (err) {
    return errorResponse('Failed to update member', 500);
  }
});

// DELETE /api/members/[id] - Delete member (soft delete by deactivating)
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params, session } = context;
  if (!params?.id) {
    return notFoundResponse('Member');
  }

  try {
    // Check if member exists
    const memberDoc = await adminDb.collection('members').doc(params.id).get();
    
    if (!memberDoc.exists) {
      return notFoundResponse('Member');
    }

    // Check if member has active memberships
    const activeMemberships = await adminDb.collection('memberMemberships')
      .where('memberId', '==', params.id)
      .where('status', 'in', ['active', 'pending'])
      .get();

    if (!activeMemberships.empty) {
      return badRequestResponse('Cannot delete member with active memberships. Please cancel or expire memberships first.');
    }

    // Check if member has children linked to them
    const linkedChildren = await adminDb.collection('members')
      .where('parentId', '==', params.id)
      .get();

    if (!linkedChildren.empty) {
      return badRequestResponse('Cannot delete member who has linked children. Please reassign or remove child links first.');
    }

    // Soft delete: deactivate the member instead of actually deleting
    await adminDb.collection('members').doc(params.id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    });

    // Also disable the Firebase Authentication account
    try {
      await adminAuth.updateUser(params.id, { disabled: true });
    } catch (authError) {
      // If Firebase auth update fails, log but don't fail the operation
      // The member is still deactivated in our system
    }

    return successResponse(null, 'Member deactivated successfully');
  } catch (err) {
    return errorResponse('Failed to delete member', 500);
  }
});