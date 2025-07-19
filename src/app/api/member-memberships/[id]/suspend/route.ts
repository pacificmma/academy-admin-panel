// src/app/api/member-memberships/[id]/suspend/route.ts - FIXED Suspend membership endpoint
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for suspending membership
const suspendMembershipSchema = z.object({
  reason: z.string().min(1, 'Suspension reason is required').max(500, 'Reason must be less than 500 characters'),
});

// POST /api/member-memberships/[id]/suspend - Suspend membership
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams;
    
    if (!params?.id) {
      return badRequestResponse('Member membership ID is required');
    }

    const body = await request.json();
    const validation = suspendMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const { reason } = validation.data;

    const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return notFoundResponse('Member membership');
    }

    const membershipData = membershipDoc.data();
    if (membershipData?.status !== 'active') {
      return badRequestResponse('Only active memberships can be suspended');
    }

    // Update membership to suspended status
    const updateData = {
      status: 'suspended',
      suspensionReason: reason.trim(),
      suspendedBy: session.uid,
      suspensionDate: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    await adminDb.collection('memberMemberships').doc(params.id).update(updateData);

    return successResponse(null, 'Membership suspended successfully');

  } catch (error) {
    console.error('Error in POST /api/member-memberships/[id]/suspend:', error);
    return errorResponse('Failed to suspend membership', 500);
  }
});