// src/app/api/classes/instances/[id]/route.ts - Individual Class Instance Management (Modified to fix instructorName update logic)

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { RequestContext, requireStaffOrTrainer, requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { ClassInstance, ClassStatus } from '@/app/types/class';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for updating class instance
const classInstanceUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  classType: z.enum(['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts']).optional(),
  instructorId: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
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
      duration: 0,
      description: undefined
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

    await instanceRef.update(updatePayload);

    return successResponse({ id: params.id, ...currentInstance, ...updatePayload }, 'Class instance updated successfully');
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