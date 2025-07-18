// src/app/api/classes/instances/[id]/end/route.ts - FIXED
import { requireTrainer, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse, badRequestResponse, notFoundResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// POST /api/classes/instances/[id]/end - End a class instance
export const POST = requireTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    
    // FIXED: Await params before accessing properties (Next.js 15 requirement)
    const awaitedParams = await params;
    const instanceId = Array.isArray(awaitedParams?.id) ? awaitedParams.id[0] : awaitedParams?.id;
    
    if (!instanceId) {
      return badRequestResponse('Class instance ID is required');
    }
    
    const instanceRef = adminDb.collection('classInstances').doc(instanceId);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance not found');
    }

    const data = instanceDoc.data()!;

    // Check if class can be ended
    if (data.status !== 'ongoing') {
      return badRequestResponse(`Class cannot be ended. Current status: ${data.status}`);
    }

    // Parse optional body for additional data
    let actualDuration;
    try {
      const body = await request.json();
      actualDuration = body.actualDuration;
    } catch {
      // No body provided, that's fine
    }

    const updateData: any = {
      status: 'completed',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (actualDuration && typeof actualDuration === 'number' && actualDuration > 0) {
      updateData.actualDuration = actualDuration;
    }

    await instanceRef.update(updateData);

    return successResponse({ message: 'Class ended successfully' });
  } catch (error) {
    console.error('Error ending class:', error);
    return errorResponse('Failed to end class', 500);
  }
});