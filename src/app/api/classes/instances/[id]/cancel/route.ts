// src/app/api/classes/instances/[id]/cancel/route.ts - FIXED
import { requireAdmin, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse, badRequestResponse, notFoundResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// POST /api/classes/instances/[id]/cancel - Cancel a class instance
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    
    // FIXED: Await params before accessing properties (Next.js 15 requirement)
    const awaitedParams = await params;
    const instanceId = Array.isArray(awaitedParams?.id) ? awaitedParams.id[0] : awaitedParams?.id;
    
    if (!instanceId) {
      return badRequestResponse('Class instance ID is required');
    }
    
    const body = await request.json();
    const { reason } = body;

    const instanceRef = adminDb.collection('classInstances').doc(instanceId);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance not found');
    }

    const data = instanceDoc.data()!;

    // Check if class can be cancelled
    if (data.status === 'completed' || data.status === 'cancelled') {
      return badRequestResponse(`Class cannot be cancelled. Current status: ${data.status}`);
    }

    const updateData: any = {
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (reason && typeof reason === 'string' && reason.trim() !== '') {
      updateData.cancellationReason = reason.trim();
    }

    await instanceRef.update(updateData);

    // TODO: Send notifications to registered participants about cancellation

    return successResponse({ message: 'Class cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling class:', error);
    return errorResponse('Failed to cancel class', 500);
  }
});