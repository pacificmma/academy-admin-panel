// src/app/api/classes/instances/[id]/participants/route.ts - Manage Class Participants

import { RequestContext, requireStaffOrTrainer } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { FieldPath } from "firebase-admin/firestore";
import { NextRequest } from "next/server";


// FIXED: Changed function name and export style to fit Next.js API routes
export const GET_PARTICIPANTS = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
    try {
      const { params } = context;
      if (!params?.id) {
        return errorResponse('Class instance ID is required', 400);
      }
      const instanceDoc = await adminDb.collection('classInstances').doc(params.id).get();
      
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
      .where(FieldPath.documentId(), 'in', participantIds) // FIXED: Corrected FieldPath usage
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
      console.error('Get participants error:', error);
      return errorResponse('Failed to load participants');
    }
  });