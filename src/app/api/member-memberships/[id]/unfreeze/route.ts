// src/app/api/member-memberships/[id]/unfreeze/route.ts - Unfreeze membership endpoint
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for unfreezing membership
const unfreezeMembershipSchema = z.object({
  reason: z.string().min(1, 'Unfreeze reason is required').max(500, 'Reason must be less than 500 characters'),
});

// POST /api/member-memberships/[id]/unfreeze - Unfreeze membership
export const POST = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams; // Await params in NextJS 15+
    
    if (!params?.id) {
      return errorResponse('Member membership ID is required', 400);
    }

    const body = await request.json();
    const validation = unfreezeMembershipSchema.safeParse(body);

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

    // Only allow unfreezing frozen memberships
    if (membershipData.status !== 'frozen') {
      return badRequestResponse('Only frozen memberships can be unfrozen');
    }

    const unfreezeDate = new Date();
    const freezeStartDate = new Date(membershipData.freezeStartDate);
    const plannedFreezeEndDate = new Date(membershipData.freezeEndDate);
    
    // Calculate how much time was actually frozen
    const actualFreezeDuration = unfreezeDate.getTime() - freezeStartDate.getTime();
    const plannedFreezeDuration = plannedFreezeEndDate.getTime() - freezeStartDate.getTime();
    
    // Calculate the new end date
    let newEndDate: Date;
    if (actualFreezeDuration < plannedFreezeDuration) {
      // Unfreezing early - adjust the end date by removing unused freeze time
      const unusedFreezeTime = plannedFreezeDuration - actualFreezeDuration;
      const currentEndDate = new Date(membershipData.endDate);
      newEndDate = new Date(currentEndDate.getTime() - unusedFreezeTime);
    } else {
      // Unfreezing on time or late - keep current end date
      newEndDate = new Date(membershipData.endDate);
    }

    // Ensure the new end date is not in the past
    if (newEndDate <= unfreezeDate) {
      // If calculated end date is in the past, set it to a reasonable future date
      newEndDate = new Date(unfreezeDate);
      newEndDate.setDate(newEndDate.getDate() + 7); // Give 7 days grace period
    }

    // Add note about unfreeze
    const unfreezeNote = `Unfrozen on ${unfreezeDate.toISOString()}: ${reason.trim()}`;
    const updatedNotes = membershipData.notes ? 
      `${membershipData.notes}\n\n${unfreezeNote}` : 
      unfreezeNote;

    // Update membership to active status
    const updateData: any = {
      status: 'active',
      endDate: newEndDate.toISOString(),
      unfreezeDate: unfreezeDate.toISOString(),
      unfreezeReason: reason.trim(),
      // Clear freeze fields but keep them for history
      freezeStartDate: null,
      freezeEndDate: null,
      freezeReason: null,
      originalEndDate: null,
      notes: updatedNotes,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    await adminDb.collection('memberMemberships').doc(params.id).update(updateData);

    return successResponse(null, 'Membership unfrozen successfully');

  } catch (error) {
    console.error('Error in POST /api/member-memberships/[id]/unfreeze:', error);
    return errorResponse('Failed to unfreeze membership', 500);
  }
});