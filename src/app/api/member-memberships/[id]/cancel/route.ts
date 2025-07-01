// src/app/api/member-memberships/[id]/cancel/route.ts - Cancel membership endpoint
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse } from '@/app/lib/api/response-utils';

// POST /api/member-memberships/[id]/cancel - Cancel membership
export const POST = requireAdmin(async (
    request: NextRequest,
    context: RequestContext
  ) => {
    try {
      const { params, session } = context;
      if (!params?.id) {
        return errorResponse('Member membership ID is required', 400);
      }
      const body = await request.json();
      const { reason } = body;
  
      if (!reason || reason.trim().length === 0) {
        return errorResponse('Cancellation reason is required', 400);
      }
  
      // Check if membership exists and is active
      const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
      if (!membershipDoc.exists) {
        return errorResponse('Member membership not found', 404);
      }
  
      const membershipData = membershipDoc.data();
      if (membershipData?.status !== 'active') {
        return errorResponse('Only active memberships can be cancelled', 400);
      }
  
      await adminDb.collection('memberMemberships').doc(params.id).update({
        status: 'cancelled',
        cancellationReason: reason.trim(),
        cancelledBy: session.uid,
        updatedAt: new Date().toISOString(),
      });
  
      return successResponse(null, 'Membership cancelled successfully');
  
    } catch (error) {
      return errorResponse('Failed to cancel membership', 500, { details: error });
    }
  });