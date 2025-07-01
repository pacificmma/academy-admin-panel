// src/app/api/classes/instances/[id]/end/route.ts - End Class Instance

import { RequestContext, requireTrainer } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// FIXED: Changed function name and export style to fit Next.js API routes
export async function POST(request: NextRequest, context: RequestContext) {
  try {
    const { session, params } = context;
    if (!params?.id) {
      return errorResponse('Class instance ID is required', 400);
    }
    const body = await request.json();
    const { actualDuration, notes } = body;

    const instanceRef = adminDb.collection('classInstances').doc(params.id);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return errorResponse('Class instance not found', 404);
    }

    const data = instanceDoc.data()!;

    // Check if user can manage this class
    if (session.role !== 'admin' && data.instructorId !== session.uid) {
      return errorResponse('Unauthorized', 403);
    }

    // Check if class can be ended
    if (data.status !== 'ongoing') {
      return errorResponse('Class cannot be ended', 400);
    }

    const updateData: any = {
      status: 'completed',
      // FIXED: Corrected FieldValue.serverTimestamp() usage
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
    console.error('End class error:', error);
    return errorResponse('Failed to end class');
  }
};