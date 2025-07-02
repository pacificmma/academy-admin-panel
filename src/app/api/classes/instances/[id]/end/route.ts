// src/app/api/classes/instances/[id]/end/route.ts - End Class Instance

import { requireTrainer, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// POST /api/classes/instances/[id]/end - End a class instance
export const POST = requireTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    const instanceId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    
    if (!instanceId) {
      return errorResponse('Class instance ID is required', 400);
    }
    
    const body = await request.json();
    const { actualDuration, notes } = body;

    const instanceRef = adminDb.collection('classInstances').doc(instanceId);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return errorResponse('Class instance not found', 404);
    }

    const data = instanceDoc.data()!;

    // Check if class can be ended
    if (data.status !== 'ongoing') {
      return errorResponse('Class cannot be ended', 400);
    }

    const updateData: any = {
      status: 'completed',
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (actualDuration) {
      updateData.actualDuration = actualDuration;
    }

    if (notes) {
      updateData.notes = notes;
    }

    await instanceRef.update(updateData);

    return successResponse({ message: 'Class ended successfully' });
  } catch (error) {
    return errorResponse('Failed to end class');
  }
});