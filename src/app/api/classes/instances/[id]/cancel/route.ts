// src/app/api/classes/instances/[id]/cancel/route.ts - Cancel Class Instance

import { RequestContext, requireAdmin } from "@/app/lib/api/middleware";
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
      const { reason } = body;
  
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
  
      // Check if class can be cancelled
      if (data.status === 'completed' || data.status === 'cancelled') {
        return errorResponse('Class cannot be cancelled', 400);
      }
  
      const updateData: any = {
        status: 'cancelled',
        // FIXED: Corrected FieldValue.serverTimestamp() usage
        updatedAt: FieldValue.serverTimestamp(),
      };
  
      if (reason) {
        updateData.cancellationReason = reason;
      }
  
      await instanceRef.update(updateData);
  
      // TODO: Send notifications to registered participants about cancellation
  
      return successResponse({ message: 'Class cancelled successfully' });
    } catch (error) {
      console.error('Cancel class error:', error);
      return errorResponse('Failed to cancel class');
    }
  };