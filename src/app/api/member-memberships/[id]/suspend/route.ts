//src/app/api/member-memberships/[id]/suspend/route.ts - FIXED VERSION
// ============================================

import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';

// POST /api/member-memberships/[id]/suspend - Suspend membership
export const POST = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { params, session } = context;
    
    if (!params?.id) {
      return badRequestResponse('Member membership ID is required');
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || reason.trim().length === 0) {
      return badRequestResponse('Suspension reason is required');
    }

    const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id as string).get();
    if (!membershipDoc.exists) {
      return notFoundResponse('Member membership');
    }

    const membershipData = membershipDoc.data();
    if (membershipData?.status !== 'active') {
      return badRequestResponse('Only active memberships can be suspended');
    }

    await adminDb.collection('memberMemberships').doc(params.id as string).update({
      status: 'suspended',
      suspensionReason: reason.trim(),
      suspendedBy: session.uid,
      suspensionDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return successResponse(null, 'Membership suspended successfully');

  } catch (error) {
    return errorResponse('Failed to suspend membership', 500);
  }
});