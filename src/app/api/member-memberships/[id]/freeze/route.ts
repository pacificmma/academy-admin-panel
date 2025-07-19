// src/app/api/member-memberships/[id]/freeze/route.ts - Freeze membership endpoint
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for freezing membership
const freezeMembershipSchema = z.object({
  reason: z.string().min(1, 'Freeze reason is required').max(500, 'Reason must be less than 500 characters'),
  freezeDuration: z.number().min(1).max(365).optional(), // Duration in days
  freezeEndDate: z.string().optional(), // Specific end date
}).refine(
  (data) => data.freezeDuration || data.freezeEndDate,
  {
    message: "Either freezeDuration (in days) or freezeEndDate must be provided",
  }
);

// POST /api/member-memberships/[id]/freeze - Freeze membership
export const POST = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams; // Await params in NextJS 15+
    
    if (!params?.id) {
      return errorResponse('Member membership ID is required', 400);
    }

    const body = await request.json();
    const validation = freezeMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const { reason, freezeDuration, freezeEndDate } = validation.data;

    // Check if membership exists
    const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return notFoundResponse('Member membership');
    }

    const membershipData = membershipDoc.data();
    if (!membershipData) {
      return notFoundResponse('Member membership');
    }

    // Only allow freezing active memberships
    if (membershipData.status !== 'active') {
      return badRequestResponse('Only active memberships can be frozen');
    }

    const freezeStartDate = new Date();
    let calculatedFreezeEndDate: Date;

    // Calculate freeze end date
    if (freezeDuration) {
      calculatedFreezeEndDate = new Date();
      calculatedFreezeEndDate.setDate(calculatedFreezeEndDate.getDate() + freezeDuration);
    } else if (freezeEndDate) {
      calculatedFreezeEndDate = new Date(freezeEndDate);
      // Validate that freeze end date is in the future
      if (calculatedFreezeEndDate <= new Date()) {
        return badRequestResponse('Freeze end date must be in the future');
      }
    } else {
      return badRequestResponse('Either freeze duration or freeze end date must be provided');
    }

    // Store original end date if not already stored
    const originalEndDate = membershipData.originalEndDate || membershipData.endDate;
    
    // Calculate new end date by extending the membership
    const currentEndDate = new Date(membershipData.endDate);
    const freezeDurationMs = calculatedFreezeEndDate.getTime() - freezeStartDate.getTime();
    const newEndDate = new Date(currentEndDate.getTime() + freezeDurationMs);

    // Add note about freeze
    const freezeNote = `Frozen on ${freezeStartDate.toISOString()}: ${reason.trim()}`;
    const updatedNotes = membershipData.notes ? 
      `${membershipData.notes}\n\n${freezeNote}` : 
      freezeNote;

    // Update membership to frozen status
    const updateData: any = {
      status: 'frozen',
      freezeStartDate: freezeStartDate.toISOString(),
      freezeEndDate: calculatedFreezeEndDate.toISOString(),
      freezeReason: reason.trim(),
      originalEndDate: originalEndDate,
      endDate: newEndDate.toISOString(), // Extend the membership
      notes: updatedNotes,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    await adminDb.collection('memberMemberships').doc(params.id).update(updateData);

    return successResponse(null, 'Membership frozen successfully');

  } catch (error) {
    console.error('Error in POST /api/member-memberships/[id]/freeze:', error);
    return errorResponse('Failed to freeze membership', 500);
  }
});