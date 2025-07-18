// src/app/api/classes/schedules/[id]/route.ts - COMPLETELY FIXED
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, RecurrencePattern } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// FIXED: Validation schema for class schedule updates with correct Zod syntax
const classScheduleUpdateSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100).optional(),
  classType: z.string().min(1, 'Class type is required').optional(),
  instructorId: z.string().min(1, 'Instructor is required').optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
  scheduleType: z.enum(['single', 'recurring']).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format').optional(),
  location: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
}).refine((data) => {
  // Custom validation for recurring schedules
  if (data.scheduleType === 'recurring') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'Days of week are required for recurring schedules',
  path: ['daysOfWeek']
});

// GET /api/classes/schedules/[id] - Get specific class schedule
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    
    if (!params?.id) {
      return badRequestResponse('Schedule ID is required');
    }

    const scheduleRef = adminDb.collection('classSchedules').doc(params.id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return notFoundResponse('Class schedule');
    }

    const data = scheduleDoc.data()!;

    // Check if trainer can access this schedule
    if ((session.role === 'trainer' || session.role === 'visiting_trainer') && data.instructorId !== session.uid) {
      return errorResponse('Access denied', 403);
    }

    // Get instructor name
    let instructorName = 'Unknown';
    try {
      const instructorDoc = await adminDb.collection('staff').doc(data.instructorId).get();
      if (instructorDoc.exists) {
        instructorName = instructorDoc.data()?.fullName || 'Unknown';
      }
    } catch (error) {
      console.error('Error fetching instructor:', error);
    }

    const schedule: ClassSchedule = {
      id: scheduleDoc.id,
      name: data.name || '',
      classType: data.classType || '',
      instructorId: data.instructorId || '',
      instructorName,
      maxParticipants: data.maxParticipants || 20,
      duration: data.duration || 60,
      startDate: data.startDate || '',
      startTime: data.startTime || '',
      recurrence: data.recurrence || { scheduleType: 'single' },
      location: data.location || '',
      notes: data.notes || '',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data.createdBy || '',
      updatedBy: data.updatedBy,
    };

    return successResponse(schedule);
  } catch (error) {
    console.error('Error fetching class schedule:', error);
    return errorResponse('Failed to fetch class schedule', 500);
  }
});

// PUT /api/classes/schedules/[id] - Update a class schedule
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    
    if (!params?.id) {
      return badRequestResponse('Schedule ID is required');
    }

    const body = await request.json();
    const validationResult = classScheduleUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return badRequestResponse(firstError?.message || 'Invalid input');
    }

    const updates = validationResult.data;

    const scheduleRef = adminDb.collection('classSchedules').doc(params.id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return notFoundResponse('Class schedule');
    }

    const oldSchedule = scheduleDoc.data()!;

    // Verify instructor exists if changing
    let instructorName = oldSchedule.instructorName;
    if (updates.instructorId && updates.instructorId !== oldSchedule.instructorId) {
      const instructorDoc = await adminDb.collection('staff').doc(updates.instructorId).get();
      if (!instructorDoc.exists) {
        return badRequestResponse('Instructor not found');
      }
      const instructorData = instructorDoc.data()!;
      if (!instructorData.isActive) {
        return badRequestResponse('Selected instructor is not active');
      }
      instructorName = instructorData.fullName || 'Unknown';
    }

    // Construct recurrence pattern if schedule type is being updated
    let recurrencePattern: RecurrencePattern | undefined;
    if (updates.scheduleType) {
      recurrencePattern = {
        scheduleType: updates.scheduleType,
        daysOfWeek: updates.scheduleType === 'recurring' ? (updates.daysOfWeek || []) : undefined,
        endDate: updates.recurrenceEndDate ? new Date(updates.recurrenceEndDate).toISOString() : undefined,
      };
    }

    // Prepare update data
    const updateData: any = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    if (instructorName) {
      updateData.instructorName = instructorName;
    }

    if (recurrencePattern) {
      updateData.recurrence = recurrencePattern;
    }

    // Update the schedule
    await scheduleRef.update(updateData);

    // Get updated document
    const updatedDoc = await scheduleRef.get();
    const updatedData = updatedDoc.data()!;

    const updatedSchedule: ClassSchedule = {
      id: updatedDoc.id,
      name: updatedData.name || '',
      classType: updatedData.classType || '',
      instructorId: updatedData.instructorId || '',
      instructorName: updatedData.instructorName || 'Unknown',
      maxParticipants: updatedData.maxParticipants || 20,
      duration: updatedData.duration || 60,
      startDate: updatedData.startDate || '',
      startTime: updatedData.startTime || '',
      recurrence: updatedData.recurrence || { scheduleType: 'single' },
      location: updatedData.location || '',
      notes: updatedData.notes || '',
      isActive: updatedData.isActive ?? true,
      createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: updatedData.createdBy || '',
      updatedBy: session.uid,
    };

    return successResponse(updatedSchedule);
  } catch (error) {
    console.error('Error updating class schedule:', error);
    
    if (error instanceof z.ZodError) {
      return badRequestResponse('Validation failed: ' + error.errors[0]?.message);
    }
    
    return errorResponse('Failed to update class schedule', 500);
  }
});

// DELETE /api/classes/schedules/[id] - Delete a class schedule
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    
    if (!params?.id) {
      return badRequestResponse('Schedule ID is required');
    }

    const scheduleRef = adminDb.collection('classSchedules').doc(params.id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return notFoundResponse('Class schedule');
    }

    // Check if there are associated instances
    const instancesQuery = await adminDb.collection('classInstances')
      .where('scheduleId', '==', params.id)
      .get();

    if (!instancesQuery.empty) {
      // Delete all associated instances first
      const batch = adminDb.batch();
      instancesQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Delete the schedule
    await scheduleRef.delete();

    return successResponse({ message: 'Class schedule and associated instances deleted successfully' });
  } catch (error) {
    console.error('Error deleting class schedule:', error);
    return errorResponse('Failed to delete class schedule', 500);
  }
});