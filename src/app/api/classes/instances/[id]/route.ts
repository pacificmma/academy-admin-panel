// src/app/api/classes/instances/[id]/route.ts - Individual Class Instance Management (Updated with fixed price update logic)

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { RequestContext, requireStaffOrTrainer, requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { ClassInstance, ClassStatus } from '@/app/types/class';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// Validation schema for updating class instance
const classInstanceUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  classType: z.enum(['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts']).optional(),
  instructorId: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(), // in minutes
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  price: z.number().nonnegative().optional(), // Price for this specific instance
  location: z.string().optional(),
  notes: z.string().optional(),
  actualDuration: z.number().int().min(0).optional(),
});

// GET /api/classes/instances/[id] - Get a single class instance
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return badRequestResponse('Class instance ID is required');
    }

    const instanceDoc = await adminDb.collection('classInstances').doc(params.id).get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance');
    }

    const data = instanceDoc.data()!;

    // Trainer access control: Trainers can only view their own assigned instances
    if (session.role === 'trainer' && data.instructorId !== session.uid) {
      return errorResponse('Access denied: Trainers can only view their assigned classes', 403);
    }

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
      duration: data.duration,
      description: data.description,
    };

    return successResponse(instance);
  } catch (error) {
    console.error('Get instance error:', error);
    return errorResponse('Failed to load class instance');
  }
});

// PUT /api/classes/instances/[id] - Update a class instance
export const PUT = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return badRequestResponse('Class instance ID is required');
    }

    const instanceRef = adminDb.collection('classInstances').doc(params.id);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance');
    }

    const currentInstance = instanceDoc.data()!;

    // Trainer access control: Trainers can only update their own assigned instances
    if (session.role === 'trainer' && currentInstance.instructorId !== session.uid) {
      return errorResponse('Access denied: Trainers can only update their assigned classes', 403);
    }

    const body = await request.json();
    const validatedData = classInstanceUpdateSchema.parse(body);

    const updatePayload: Record<string, any> = {
      ...validatedData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // If instructorId is being changed, verify the new instructor exists and update instructorName
    if (validatedData.instructorId && validatedData.instructorId !== currentInstance.instructorId) {
      const newInstructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
      if (!newInstructorDoc.exists) {
        return badRequestResponse('New instructor not found');
      }
      updatePayload.instructorName = newInstructorDoc.data()?.fullName || 'Unknown';
    }

    // Recalculate endTime if startTime or duration changed
    if (validatedData.startTime || validatedData.duration) {
        const newStartTime = validatedData.startTime || currentInstance.startTime;
        const newDuration = validatedData.duration || currentInstance.duration;
        
        const [hours, minutes] = newStartTime.split(':').map(Number);
        const dummyDate = new Date(); // Use a dummy date for time calculations
        dummyDate.setHours(hours, minutes, 0, 0);
        
        const endTimeDate = addMinutes(dummyDate, newDuration);
        updatePayload.endTime = formatFns(endTimeDate, 'HH:mm');
    }


    await instanceRef.update(updatePayload);

    // Fetch the updated document to return the most current state
    const updatedDoc = await instanceRef.get();
    const updatedInstanceData = updatedDoc.data();

    const updatedInstance: ClassInstance = {
        id: updatedDoc.id,
        scheduleId: updatedInstanceData?.scheduleId,
        name: updatedInstanceData?.name,
        classType: updatedInstanceData?.classType,
        instructorId: updatedInstanceData?.instructorId,
        instructorName: updatedInstanceData?.instructorName,
        date: updatedInstanceData?.date,
        startTime: updatedInstanceData?.startTime,
        endTime: updatedInstanceData?.endTime,
        maxParticipants: updatedInstanceData?.maxParticipants,
        registeredParticipants: updatedInstanceData?.registeredParticipants || [],
        waitlist: updatedInstanceData?.waitlist || [],
        status: updatedInstanceData?.status,
        location: updatedInstanceData?.location || '',
        notes: updatedInstanceData?.notes || '',
        actualDuration: updatedInstanceData?.actualDuration,
        createdAt: updatedInstanceData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: updatedInstanceData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        duration: updatedInstanceData?.duration,
        description: updatedInstanceData?.description
    };


    return successResponse(updatedInstance, 'Class instance updated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    console.error('Update instance error:', error);
    return errorResponse('Failed to update class instance');
  }
});

// DELETE /api/classes/instances/[id] - Cancel a class instance (soft delete)
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return badRequestResponse('Class instance ID is required');
    }

    const instanceRef = adminDb.collection('classInstances').doc(params.id);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance');
    }

    // Instead of deleting, update the status to 'cancelled'
    await instanceRef.update({
      status: 'cancelled' as ClassStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return successResponse(null, 'Class instance cancelled successfully');
  } catch (error) {
    console.error('Delete (cancel) instance error:', error);
    return errorResponse('Failed to cancel class instance');
  }
});