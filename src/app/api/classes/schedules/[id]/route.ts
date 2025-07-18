// src/app/api/classes/schedules/[id]/route.ts - Individual Class Schedule API
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, ClassFormData, ClassScheduleWithoutIdAndTimestamps, RecurrencePattern } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// Validation schema for class schedule updates
const classScheduleUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  classType: z.string().min(1).optional(),
  instructorId: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduleType: z.enum(['single', 'recurring']).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
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
    if (session.role === 'trainer' && data.instructorId !== session.uid) {
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
      name: data.name,
      classType: data.classType,
      instructorId: data.instructorId,
      instructorName,
      maxParticipants: data.maxParticipants,
      duration: data.duration,
      startDate: data.startDate,
      startTime: data.startTime,
      recurrence: data.recurrence,
      location: data.location || '',
      notes: data.notes || '',
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data.createdBy,
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
      instructorName = instructorDoc.data()?.fullName || 'Unknown';
    }

    // Construct recurrence pattern if schedule type is being updated
    let recurrencePattern: RecurrencePattern | undefined;
    if (updates.scheduleType) {
      recurrencePattern = updates.scheduleType === 'recurring' ? {
        scheduleType: 'recurring' as const,
        daysOfWeek: updates.daysOfWeek || oldSchedule.recurrence?.daysOfWeek,
      } : {
        scheduleType: 'single' as const,
      };
    }

    const updateData = {
      ...updates,
      ...(instructorName !== oldSchedule.instructorName && { instructorName }),
      ...(recurrencePattern && { recurrence: recurrencePattern }),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    await scheduleRef.update(updateData);

    // Check if we need to regenerate instances
    const shouldRegenerate =
      updates.scheduleType ||
      updates.startDate ||
      updates.startTime ||
      updates.duration ||
      (updates.scheduleType === 'recurring' && updates.daysOfWeek);

    if (shouldRegenerate) {
      // Delete existing instances for this schedule
      const existingInstances = await adminDb.collection('classInstances')
        .where('scheduleId', '==', params.id)
        .get();
      
      if (!existingInstances.empty) {
        const deleteBatch = adminDb.batch();
        existingInstances.docs.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
      }

      // Generate new instances if it's still active
      const updatedScheduleData = { ...oldSchedule, ...updateData };
      
      // Ensure recurrence pattern exists and check its type safely
      if (updatedScheduleData.recurrence?.scheduleType === 'recurring') {
        await generateClassInstances(params.id, updatedScheduleData);
      } else if (updatedScheduleData.recurrence?.scheduleType === 'single') {
        await createSingleClassInstance(params.id, updatedScheduleData);
      }
    }

    return successResponse({ message: 'Class schedule updated successfully' });
  } catch (error) {
    console.error('Error updating class schedule:', error);
    return errorResponse('Failed to update class schedule', 500);
  }
});

// DELETE /api/classes/schedules/[id] - Delete a class schedule and its instances
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

    // Use a batch to delete schedule and all its instances atomically
    const batch = adminDb.batch();

    // Delete all associated class instances
    const instancesSnapshot = await adminDb.collection('classInstances')
      .where('scheduleId', '==', params.id)
      .get();
    
    instancesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Delete the schedule itself
    batch.delete(scheduleRef);

    await batch.commit();

    return successResponse({ 
      message: 'Class schedule and its instances deleted successfully',
      deletedInstances: instancesSnapshot.size 
    });
  } catch (error) {
    console.error('Error deleting class schedule:', error);
    return errorResponse('Failed to delete class schedule', 500);
  }
});

// Helper function to generate class instances
async function generateClassInstances(scheduleId: string, schedule: any) {
  try {
    if (!schedule.recurrence?.daysOfWeek || schedule.recurrence.scheduleType !== 'recurring') {
      throw new Error('Invalid recurrence pattern for generating instances.');
    }

    // Import the helper function if available, or implement basic generation
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(today.getMonth() + 3); // Generate for 3 months

    const batch = adminDb.batch();
    const instancesCollection = adminDb.collection('classInstances');
    
    // Simple implementation - generate instances for the next 3 months
    const daysOfWeek = schedule.recurrence.daysOfWeek;
    const startDate = new Date(schedule.startDate);
    const currentDate = new Date(Math.max(today.getTime(), startDate.getTime()));
    
    while (currentDate <= endDate) {
      if (daysOfWeek.includes(currentDate.getDay())) {
        const [hours, minutes] = schedule.startTime.split(':').map(Number);
        const startTimeDate = new Date();
        startTimeDate.setHours(hours, minutes, 0, 0);
        const endTimeDate = addMinutes(startTimeDate, schedule.duration);
        const endTime = formatFns(endTimeDate, 'HH:mm');

        const instanceRef = instancesCollection.doc();
        const instanceData = {
          scheduleId,
          name: schedule.name,
          classType: schedule.classType,
          instructorId: schedule.instructorId,
          instructorName: schedule.instructorName,
          date: formatFns(currentDate, 'yyyy-MM-dd'),
          startTime: schedule.startTime,
          endTime,
          maxParticipants: schedule.maxParticipants,
          registeredParticipants: [],
          waitlist: [],
          status: 'scheduled',
          location: schedule.location || '',
          notes: schedule.notes || '',
          duration: schedule.duration,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        batch.set(instanceRef, instanceData);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error generating class instances:', error);
    throw error;
  }
}

// Helper function to create single class instance
async function createSingleClassInstance(scheduleId: string, schedule: any) {
  try {
    const [hours, minutes] = schedule.startTime.split(':').map(Number);
    const startTimeDate = new Date();
    startTimeDate.setHours(hours, minutes, 0, 0);
    const endTimeDate = addMinutes(startTimeDate, schedule.duration);
    const endTime = formatFns(endTimeDate, 'HH:mm');

    const instanceData = {
      scheduleId,
      name: schedule.name,
      classType: schedule.classType,
      instructorId: schedule.instructorId,
      instructorName: schedule.instructorName,
      date: schedule.startDate,
      startTime: schedule.startTime,
      endTime,
      maxParticipants: schedule.maxParticipants,
      registeredParticipants: [],
      waitlist: [],
      status: 'scheduled',
      location: schedule.location || '',
      notes: schedule.notes || '',
      duration: schedule.duration,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('classInstances').add(instanceData);
  } catch (error) {
    console.error('Error creating single class instance:', error);
    throw error;
  }
}