// src/app/api/classes/instances/[id]/route.ts - Individual Class Instance Management

import { RequestContext, requireStaffOrTrainer } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { ClassInstance } from "@/app/types/class";
import { NextRequest } from "next/server";

// FIXED: Changed function name and export style to fit Next.js API routes
export const GET_INSTANCE = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
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
      const instance: ClassInstance = {
        id: instanceDoc.id,
        scheduleId: data.scheduleId,
        name: data.name,
        classType: data.classType,
        instructorId: data.instructorId,
        instructorName: data.instructorName,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        maxParticipants: data.maxParticipants,
        registeredParticipants: data.registeredParticipants || [],
        waitlist: data.waitlist || [],
        status: data.status,
        location: data.location || '',
        notes: data.notes || '',
        actualDuration: data.actualDuration,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
  
      return successResponse(instance);
    } catch (error) {
      console.error('Get instance error:', error);
      return errorResponse('Failed to load class instance');
    }
  });