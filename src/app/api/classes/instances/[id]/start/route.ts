// src/app/api/classes/instances/[id]/start/route.ts - Start Class Instance

import { requireTrainer, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// POST /api/classes/instances/[id]/start - Start a class instance
export const POST = requireTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    const instanceId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    
    if (!instanceId) {
      return errorResponse('Class instance ID is required', 400);
    }
    
    const instanceRef = adminDb.collection('classInstances').doc(instanceId);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return errorResponse('Class instance not found', 404);
    }

    const data = instanceDoc.data()!;

    // Check if class can be started
    if (data.status !== 'scheduled') {
      return errorResponse('Class cannot be started', 400);
    }

    await instanceRef.update({
      status: 'ongoing',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return successResponse({ message: 'Class started successfully' });
  } catch (error) {
    return errorResponse('Failed to start class');
  }
});