// src/app/api/member-memberships/[id]/reactivate/route.ts - Reactivate membership endpoint
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';

const reactivateMembershipSchema = z.object({
  reason: z.string().min(1, 'Reactivation reason is required').max(500, 'Reason must be less than 500 characters'),
  newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format, use YYYY-MM-DD'),
  amount: z.number().min(0, 'Amount must be non-negative').optional(),
  paymentReference: z.string().max(100, 'Payment reference must be less than 100 characters').optional(),
});

// POST /api/member-memberships/[id]/reactivate - Reactivate cancelled/expired membership
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return errorResponse('Member membership ID is required', 400);
    }

    const body = await request.json();
    const validation = reactivateMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const { reason, newEndDate, amount, paymentReference } = validation.data;

    // Check if membership exists
    const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return notFoundResponse('Member membership');
    }

    const membershipData = membershipDoc.data();
    if (!membershipData) {
      return notFoundResponse('Member membership');
    }

    // Only allow reactivation of cancelled, expired, or suspended memberships
    if (!['cancelled', 'expired', 'suspended'].includes(membershipData.status)) {
      return badRequestResponse('Only cancelled, expired, or suspended memberships can be reactivated');
    }

    // Validate new end date is in the future
    const endDate = new Date(newEndDate + 'T23:59:59.999Z');
    if (endDate <= new Date()) {
      return badRequestResponse('New end date must be in the future');
    }

    // Check if member has other active memberships
    const activeMemberships = await adminDb.collection('memberMemberships')
      .where('memberId', '==', membershipData.memberId)
      .where('status', 'in', ['active', 'frozen'])
      .get();

    if (!activeMemberships.empty) {
      return badRequestResponse('Member already has an active or frozen membership. Cancel or expire existing membership first.');
    }

    // Prepare update data
    const updateData: any = {
      status: 'active',
      endDate: endDate.toISOString(),
      paymentStatus: amount !== undefined ? 'paid' : membershipData.paymentStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
      notes: membershipData.notes ? 
        `${membershipData.notes}\n\nReactivated on ${new Date().toISOString()}: ${reason.trim()}` : 
        `Reactivated on ${new Date().toISOString()}: ${reason.trim()}`,
    };

    // Add payment information if provided
    if (amount !== undefined) {
      updateData.amount = amount;
    }
    if (paymentReference) {
      updateData.paymentReference = paymentReference.trim();
    }

    // Clear cancellation/freeze information when reactivating
    if (membershipData.status === 'cancelled') {
      updateData.cancellationReason = null;
      updateData.cancelledBy = null;
    }
    if (membershipData.freezeStartDate) {
      updateData.freezeStartDate = null;
      updateData.freezeEndDate = null;
      updateData.freezeReason = null;
    }

    await adminDb.collection('memberMemberships').doc(params.id).update(updateData);

    return successResponse(null, 'Membership reactivated successfully');

  } catch (error) {
    return errorResponse('Failed to reactivate membership', 500, { details: error });
  }
});