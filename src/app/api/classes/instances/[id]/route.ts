// src/app/api/classes/instances/[id]/route.ts - FIXED
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance } from '@/app/types/class';
import { z } from 'zod';
import { requireStaffOrTrainer, requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for class instance updates
const classInstanceUpdateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100).optional(),
  classType: z.string().min(1, 'Class type is required').optional(),
  instructorId: z.string().min(1, 'Instructor is required').optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
  location: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
});

// GET /api/classes/instances/[id] - Get specific class instance
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
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

    // Calculate endTime based on startTime and duration
    const calculateEndTime = (startTime: string, duration: number): string => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + duration * 60000);
      return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    };

    const instance: ClassInstance = {
      id: instanceDoc.id,
      scheduleId: data.scheduleId || '',
      name: data.name || '',
      classType: data.classType || '',
      instructorId: data.instructorId || '',
      instructorName: data.instructorName || '',
      date: data.date || '',
      startTime: data.startTime || '',
      endTime: data.endTime || calculateEndTime(data.startTime || '00:00', data.duration || 60),
      maxParticipants: data.maxParticipants || 20,
      registeredParticipants: data.registeredParticipants || [],
      waitlist: data.waitlist || [],
      status: data.status || 'scheduled',
      location: data.location || '',
      notes: data.notes || '',
      duration: data.duration || 60,
      actualDuration: data.actualDuration,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    return successResponse(instance);
  } catch (error) {
    console.error('Get instance error:', error);
    return errorResponse('Failed to load class instance', 500);
  }
});

// PUT /api/classes/instances/[id] - Update a class instance
export const PUT = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    
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

    const currentInstance = instanceDoc.data()!;

    // Only allow updating if class hasn't started yet (for most fields)
    const body = await request.json();
    const validationResult = classInstanceUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse('Validation failed: ' + validationResult.error.errors[0]?.message);
    }

    const updates = validationResult.data;

    // Build update data, filtering out undefined values
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // FIXED: Only add fields that are not undefined to prevent Firestore errors
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.classType !== undefined) updateData.classType = updates.classType;
    if (updates.instructorId !== undefined) updateData.instructorId = updates.instructorId;
    if (updates.maxParticipants !== undefined) updateData.maxParticipants = updates.maxParticipants;
    if (updates.duration !== undefined) updateData.duration = updates.duration;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.status !== undefined) updateData.status = updates.status;

    // Calculate endTime if startTime or duration is updated
    if (updates.startTime !== undefined || updates.duration !== undefined) {
      const startTime = updates.startTime || currentInstance.startTime;
      const duration = updates.duration || currentInstance.duration;
      
      if (startTime && duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + duration * 60000);
        updateData.endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    // If instructor is being updated, fetch instructor name
    if (updates.instructorId) {
      const instructorDoc = await adminDb.collection('staff').doc(updates.instructorId).get();
      if (instructorDoc.exists) {
        const instructorData = instructorDoc.data()!;
        updateData.instructorName = instructorData.fullName || 'Unknown Instructor';
      }
    }

    // Update the instance
    await instanceRef.update(updateData);

    // Get updated document
    const updatedDoc = await instanceRef.get();
    const updatedData = updatedDoc.data()!;

    const updatedInstance: ClassInstance = {
      id: updatedDoc.id,
      scheduleId: updatedData.scheduleId || '',
      name: updatedData.name || '',
      classType: updatedData.classType || '',
      instructorId: updatedData.instructorId || '',
      instructorName: updatedData.instructorName || '',
      date: updatedData.date || '',
      startTime: updatedData.startTime || '',
      endTime: updatedData.endTime || '',
      maxParticipants: updatedData.maxParticipants || 20,
      registeredParticipants: updatedData.registeredParticipants || [],
      waitlist: updatedData.waitlist || [],
      status: updatedData.status || 'scheduled',
      location: updatedData.location || '',
      notes: updatedData.notes || '',
      duration: updatedData.duration || 60,
      actualDuration: updatedData.actualDuration,
      createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return successResponse(updatedInstance);
  } catch (error) {
    console.error('Error updating class instance:', error);
    
    if (error instanceof z.ZodError) {
      return badRequestResponse('Validation failed: ' + error.errors[0]?.message);
    }
    
    return errorResponse('Failed to update class instance', 500);
  }
});

// DELETE /api/classes/instances/[id] - Delete a class instance
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
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

    // Delete the instance
    await instanceRef.delete();

    return successResponse({ message: 'Class instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting class instance:', error);
    return errorResponse('Failed to delete class instance', 500);
  }
});