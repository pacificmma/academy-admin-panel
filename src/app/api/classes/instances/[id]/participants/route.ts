// src/app/api/classes/instances/[id]/participants/route.ts - Manage Class Participants

import { requireStaffOrTrainer, RequestContext } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldPath } from "firebase-admin/firestore";
import { NextRequest } from "next/server";

// GET /api/classes/instances/[id]/participants - Get class participants
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    const instanceId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    
    if (!instanceId) {
      return errorResponse('Class instance ID is required', 400);
    }
    
    const instanceDoc = await adminDb.collection('classInstances').doc(instanceId).get();

    if (!instanceDoc.exists) {
      return errorResponse('Class instance not found', 404);
    }

    const data = instanceDoc.data()!;
    const participantIds = [...(data.registeredParticipants || []), ...(data.waitlist || [])];

    if (participantIds.length === 0) {
      return successResponse({ registered: [], waitlist: [] });
    }

    // Get participant details
    const membersSnapshot = await adminDb.collection('members')
      .where(FieldPath.documentId(), 'in', participantIds)
      .get();

    const memberMap = new Map();
    membersSnapshot.forEach(doc => {
      memberMap.set(doc.id, {
        id: doc.id,
        ...doc.data(),
      });
    });

    const registered = (data.registeredParticipants || []).map((id: string) => memberMap.get(id)).filter(Boolean);
    const waitlist = (data.waitlist || []).map((id: string) => memberMap.get(id)).filter(Boolean);

    return successResponse({ registered, waitlist });
  } catch (error) {
    return errorResponse('Failed to load participants');
  }
});