// src/app/api/classes/instances/[id]/cancel/route.ts - Cancel Class Instance

import { requireAdmin, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// POST /api/classes/instances/[id]/cancel - Cancel a class instance
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    const instanceId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    
    if (!instanceId) {
      return errorResponse('Class instance ID is required', 400);
    }
    
    const body = await request.json();
    const { reason } = body;

    const instanceRef = adminDb.collection('classInstances').doc(instanceId);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return errorResponse('Class instance not found', 404);
    }

    const data = instanceDoc.data()!;

    // Check if class can be cancelled
    if (data.status === 'completed' || data.status === 'cancelled') {
      return errorResponse('Class cannot be cancelled', 400);
    }

    const updateData: any = {
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (reason) {
      updateData.cancellationReason = reason;
    }

    await instanceRef.update(updateData);

    // TODO: Send notifications to registered participants about cancellation

    return successResponse({ message: 'Class cancelled successfully' });
  } catch (error) {
    return errorResponse('Failed to cancel class');
  }
});