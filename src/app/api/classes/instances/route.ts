// src/app/api/classes/instances/[id]/route.ts (Updated - Removed Price Fields)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// Validation schema for updating class instances (Removed price field)
const updateInstanceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  classType: z.enum(['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts']).optional(),
  instructorId: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
});

// Validation schema for cancelling instances
const cancelInstanceSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
});

// GET /api/classes/instances/[id] - Get specific class instance
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Class instance');
  }

  try {
    const instanceDoc = await adminDb.collection('classInstances').doc(params.id).get();
    
    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance');
    }

    const instance: ClassInstance = {
      id: instanceDoc.id,
      ...instanceDoc.data(),
      createdAt: instanceDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: instanceDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as ClassInstance;

    return successResponse(instance);
  } catch (error) {
    console.error('Get instance error:', error);
    return errorResponse('Failed to fetch class instance');
  }
});

// PUT /api/classes/instances/[id] - Update class instance
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Class instance');
  }

  try {
    const body = await request.json();
    const validatedData = updateInstanceSchema.parse(body);

    const instanceRef = adminDb.collection('classInstances').doc(params.id);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance');
    }

    const currentInstance = instanceDoc.data() as ClassInstance;

    // Check if instance can be modified
    if (currentInstance.status === 'completed') {
      return errorResponse('Cannot modify completed class instances', 400);
    }

    // If instructor is being changed, verify the new instructor exists
    let instructorName = currentInstance.instructorName;
    if (validatedData.instructorId && validatedData.instructorId !== currentInstance.instructorId) {
      const instructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
      if (!instructorDoc.exists) {
        return errorResponse('Instructor not found', 400);
      }
      instructorName = instructorDoc.data()?.fullName || 'Unknown';
    }

    // Calculate new end time if start time or duration changed
    let endTime = currentInstance.endTime;
    if (validatedData.startTime || validatedData.duration) {
      const startTime = validatedData.startTime || currentInstance.startTime;
      const duration = validatedData.duration || currentInstance.duration;
      
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = addMinutes(startDate, duration);
      endTime = formatFns(endDate, 'HH:mm');
    }

    const updateData: Partial<ClassInstance> = {
      ...validatedData,
      instructorName,
      endTime,
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof ClassInstance] === undefined) {
        delete updateData[key as keyof ClassInstance];
      }
    });

    await instanceRef.update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedInstance: ClassInstance = {
      ...currentInstance,
      ...updateData,
      id: params.id,
    };

    return successResponse(updatedInstance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    console.error('Update instance error:', error);
    return errorResponse('Failed to update class instance');
  }
});

// DELETE /api/classes/instances/[id] - Cancel class instance
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Class instance');
  }

  try {
    const body = await request.json();
    const { reason } = cancelInstanceSchema.parse(body);

    const instanceRef = adminDb.collection('classInstances').doc(params.id);
    const instanceDoc = await instanceRef.get();

    if (!instanceDoc.exists) {
      return notFoundResponse('Class instance');
    }

    const instance = instanceDoc.data() as ClassInstance;

    // Check if instance can be cancelled
    if (instance.status === 'completed') {
      return errorResponse('Cannot cancel completed class instances', 400);
    }

    if (instance.status === 'cancelled') {
      return errorResponse('Class instance is already cancelled', 400);
    }

    // Check if there are registered participants
    if (instance.registeredParticipants && instance.registeredParticipants.length > 0) {
      return errorResponse('Cannot cancel class with registered participants. Please handle participant notifications first.', 400);
    }

    // Update instance status to cancelled
    await instanceRef.update({
      status: 'cancelled',
      notes: instance.notes ? `${instance.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedInstance: ClassInstance = {
      ...instance,
      id: params.id,
      status: 'cancelled',
      notes: instance.notes ? `${instance.notes}\n\nCancelled: ${reason}` : `Cancelled: ${reason}`,
      updatedAt: new Date().toISOString(),
    };

    return successResponse(updatedInstance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    console.error('Cancel instance error:', error);
    return errorResponse('Failed to cancel class instance');
  }
});