// src/app/api/member-memberships/[id]/route.ts - FIXED Individual member membership management
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { MemberMembership } from '@/app/types/membership';

// Validation schema for updating member memberships
const updateMemberMembershipSchema = z.object({
  startDate: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.literal('USD').optional(), // Only USD is allowed
  paymentReference: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'expired', 'frozen', 'suspended']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/member-memberships/[id] - Get single member membership
export const GET = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return notFoundResponse('Member membership');
    }

    const doc = await adminDb.collection('memberMemberships').doc(params.id).get();
    
    if (!doc.exists) {
      return notFoundResponse('Member membership');
    }

    const data = doc.data();
    const memberMembership: MemberMembership = {
      id: doc.id,
      ...data,
      startDate: data?.startDate || new Date().toISOString(),
      endDate: data?.endDate || new Date().toISOString(),
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as MemberMembership;

    return successResponse(memberMembership);

  } catch (err) {
    console.error('Error in GET /api/member-memberships/[id]:', err);
    return errorResponse('Failed to fetch member membership', 500);
  }
});

// PUT /api/member-memberships/[id] - Update member membership
export const PUT = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return notFoundResponse('Member membership');
    }

    const body = await request.json();
    const validation = updateMemberMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { 
        validationErrors: validation.error.issues 
      });
    }

    // Check if membership exists
    const doc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!doc.exists) {
      return notFoundResponse('Member membership');
    }

    const currentData = doc.data();

    // If updating startDate, recalculate endDate
    let updateData: any = {
      ...validation.data,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    if (validation.data.startDate && currentData?.membershipPlanId) {
      // Get the membership plan to recalculate end date
      const planDoc = await adminDb.collection('membershipPlans').doc(currentData.membershipPlanId).get();
      if (planDoc.exists) {
        const planData = planDoc.data();
        const startDate = new Date(validation.data.startDate);
        const endDate = new Date(startDate);
        
        // Calculate end date based on plan duration
        switch (planData?.durationType) {
          case 'months':
            endDate.setMonth(endDate.getMonth() + planData.duration);
            break;
          case 'days':
            endDate.setDate(endDate.getDate() + planData.duration);
            break;
          case 'years':
            endDate.setFullYear(endDate.getFullYear() + planData.duration);
            break;
        }
        
        updateData.endDate = endDate.toISOString();
      }
    }

    // Update the membership
    await adminDb.collection('memberMemberships').doc(params.id).update(updateData);

    // Get the updated membership
    const updatedDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
    const updatedMembership: MemberMembership = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as MemberMembership;

    return successResponse(updatedMembership, 'Member membership updated successfully');

  } catch (err) {
    console.error('Error in PUT /api/member-memberships/[id]:', err);
    return errorResponse('Failed to update member membership', 500);
  }
});

// DELETE /api/member-memberships/[id] - Cancel member membership (soft delete)
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return notFoundResponse('Member membership');
    }

    // Check if membership exists
    const doc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!doc.exists) {
      return notFoundResponse('Member membership');
    }

    const membershipData = doc.data();

    // Only allow deletion of inactive memberships
    if (membershipData?.status === 'active') {
      return badRequestResponse('Cannot delete active membership. Please cancel it first.');
    }

    // Soft delete: mark as cancelled instead of actually deleting
    await adminDb.collection('memberMemberships').doc(params.id).update({
      status: 'cancelled',
      cancellationReason: 'Deleted by admin',
      cancelledBy: session.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    });

    return successResponse(null, 'Member membership deleted successfully');

  } catch (err) {
    console.error('Error in DELETE /api/member-memberships/[id]:', err);
    return errorResponse('Failed to delete member membership', 500);
  }
});