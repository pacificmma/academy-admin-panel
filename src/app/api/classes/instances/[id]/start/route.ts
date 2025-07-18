// src/app/api/classes/instances/[id]/start/route.ts - FIXED
import { requireTrainer, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse, badRequestResponse, notFoundResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// POST /api/classes/instances/[id]/start - Start a class instance
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

    // Check if class can be started
    if (data.status !== 'scheduled') {
      return badRequestResponse(`Class cannot be started. Current status: ${data.status}`);
    }

    await instanceRef.update({
      status: 'ongoing',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return successResponse({ message: 'Class started successfully' });
  } catch (error) {
    console.error('Error starting class:', error);
    return errorResponse('Failed to start class', 500);
  }
});