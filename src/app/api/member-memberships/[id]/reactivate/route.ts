// ============================================
// FILE 1: src/app/api/member-memberships/[id]/reactivate/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse } from '@/app/lib/api/response-utils';

// POST /api/member-memberships/[id]/reactivate - Reactivate suspended membership
export const POST = requireAdmin(async (
  request: NextRequest,
  context: RequestContext
) => {
  try {
    const { params, session } = context;

    const membershipDoc = await adminDb.collection('memberMemberships').doc(params?.id).get();
    if (!membershipDoc.exists) {
      return errorResponse('Member membership not found', 404);
    }

    const membershipData = membershipDoc.data();
    if (membershipData?.status !== 'suspended') {
      return errorResponse('Only suspended memberships can be reactivated', 400);
    }

    // Check if membership hasn't expired
    const endDate = new Date(membershipData.endDate);
    const now = new Date();
    
    if (endDate <= now) {
      return errorResponse('Cannot reactivate expired membership', 400);
    }

    await adminDb.collection('memberMemberships').doc(params?.id).update({
      status: 'active',
      suspensionReason: null,
      suspendedBy: null,
      suspensionDate: null,
      reactivatedBy: session.uid,
      reactivatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return successResponse(null, 'Membership reactivated successfully');

  } catch (error) {
    return errorResponse('Failed to reactivate membership', 500, { details: error });
  }
});