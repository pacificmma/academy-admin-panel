// src/app/api/member-memberships/[id]/cancel/route.ts - FIXED Cancel membership endpoint
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for cancelling membership
const cancelMembershipSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Reason must be less than 500 characters'),
});

// POST /api/member-memberships/[id]/cancel - Cancel membership
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams;
    if (!params?.id) {
      return errorResponse('Member membership ID is required', 400);
    }

    const body = await request.json();
    const validation = cancelMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const { reason } = validation.data;

    // Check if membership exists
    const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return notFoundResponse('Member membership');
    }

    const membershipData = membershipDoc.data();
    if (!membershipData) {
      return notFoundResponse('Member membership');
    }

    // Only allow cancelling active or frozen memberships
    if (!['active', 'frozen'].includes(membershipData.status)) {
      return badRequestResponse('Only active or frozen memberships can be cancelled');
    }

    // Update membership to cancelled status
    const updateData: any = {
      status: 'cancelled',
      cancellationReason: reason.trim(),
      cancelledBy: session.uid,
      cancellationDate: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    // Clear freeze information if membership was frozen
    if (membershipData.status === 'frozen') {
      updateData.freezeStartDate = null;
      updateData.freezeEndDate = null;
      updateData.freezeReason = null;
    }

    // Add note about cancellation
    const cancelNote = `Cancelled on ${new Date().toISOString()}: ${reason.trim()}`;
    updateData.notes = membershipData.notes ? 
      `${membershipData.notes}\n\n${cancelNote}` : 
      cancelNote;

    await adminDb.collection('memberMemberships').doc(params.id).update(updateData);

    return successResponse(null, 'Membership cancelled successfully');

  } catch (error) {
    console.error('Error in POST /api/member-memberships/[id]/cancel:', error);
    return errorResponse('Failed to cancel membership', 500);
  }
});