// src/app/api/classes/schedules/route.ts - Class Schedule Management API (Updated for new recurrence)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, ClassFormData, generateRecurringClassDates, ClassScheduleWithoutIdAndTimestamps } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { createdResponse, successResponse, errorResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// Validation schema for class schedule (Modified for new recurrence)
const classScheduleSchema = z.object({
  name: z.string().min(3).max(100),
  classType: z.enum(['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts']),
  instructorId: z.string().min(1),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240), // Duration of each session
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Start date of first session
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // Start time of each session
  price: z.number().nonnegative(), // Price per session (for single) or packagePrice (for recurring total)
  scheduleType: z.enum(['single', 'recurring']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // Only for recurring
  recurrenceDurationValue: z.number().int().min(1).optional(), // Only for recurring
  recurrenceDurationUnit: z.enum(['weeks', 'months']).optional(), // Only for recurring
  packagePrice: z.number().nonnegative().optional(), // Only for recurring
}).superRefine((data, ctx) => {
  if (data.scheduleType === 'recurring') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one day must be selected for recurring events',
        path: ['daysOfWeek'],
      });
    }
    if (data.recurrenceDurationValue === undefined || data.recurrenceDurationValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Recurrence duration value must be greater than 0',
        path: ['recurrenceDurationValue'],
      });
    }
    if (data.packagePrice === undefined || data.packagePrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Package price must be greater than 0 for recurring events',
        path: ['packagePrice'],
      });
    }
  } else { // Single event
    if (data.price === undefined || data.price < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Price cannot be negative for single event',
        path: ['price'],
      });
    }
  }
});


// GET /api/classes/schedules - Get all class schedules
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const classType = url.searchParams.get('classType');
    const instructorId = url.searchParams.get('instructorId');

    let query: any = adminDb.collection('classSchedules')
      .where('isActive', '==', true)
      .orderBy('createdAt', 'desc');

    // Apply filters
    if (classType) {
      query = query.where('classType', '==', classType);
    }

    if (instructorId) {
      query = query.where('instructorId', '==', instructorId);
    }

    // For trainers, only show their assigned classes
    if (session.role === 'trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    const snapshot = await query.get();
    let schedules: any[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
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

      schedules.push({
        id: doc.id,
        ...data,
        instructorName,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    }

    // Apply search filtering
    if (search) {
      const searchLower = search.toLowerCase();
      schedules = schedules.filter(schedule =>
        schedule.name.toLowerCase().includes(searchLower) ||
        schedule.instructorName.toLowerCase().includes(searchLower) ||
        schedule.classType.toLowerCase().includes(searchLower) ||
        schedule.description?.toLowerCase().includes(searchLower)
      );
    }

    return successResponse(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    return errorResponse('Failed to load class schedules');
  }
});

// POST /api/classes/schedules - Create new class schedule
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;

    const body = await request.json();
    const validatedData = classScheduleSchema.parse(body);

    // Verify instructor exists
    const instructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
    if (!instructorDoc.exists) {
      return errorResponse('Instructor not found', 400);
    }

    const instructorData = instructorDoc.data();
    const instructorName = instructorData?.fullName || 'Unknown';

    // Construct recurrence pattern based on scheduleType
    const recurrencePattern = validatedData.scheduleType === 'recurring' ? {
      scheduleType: 'recurring' as const, // Explicit cast
      daysOfWeek: validatedData.daysOfWeek,
      durationValue: validatedData.recurrenceDurationValue,
      durationUnit: validatedData.recurrenceDurationUnit,
    } : {
      scheduleType: 'single' as const, // Explicit cast
    };

    // Determine the price to store in the schedule
    const schedulePrice = validatedData.scheduleType === 'recurring' ? validatedData.packagePrice : validatedData.price;

    const scheduleData: ClassScheduleWithoutIdAndTimestamps = { // Use new type alias
      name: validatedData.name,
      classType: validatedData.classType,
      instructorId: validatedData.instructorId,
      instructorName,
      maxParticipants: validatedData.maxParticipants,
      duration: validatedData.duration,
      startDate: validatedData.startDate,
      startTime: validatedData.startTime,
      recurrence: recurrencePattern,
      price: schedulePrice || 0,
      isActive: true, // New schedules are active by default
      createdBy: session.uid,
      // description and location are optional in ClassSchedule, and not expected from form
    };

    const scheduleRef = await adminDb.collection('classSchedules').add({
      ...scheduleData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Generate class instances based on scheduleType and recurrence
    if (scheduleData.recurrence.scheduleType === 'recurring') {
      await generateClassInstances(scheduleRef.id, scheduleData);
    } else {
      // For single event, create just one instance
      await createSingleClassInstance(scheduleRef.id, scheduleData);
    }

    const newSchedule: ClassSchedule = {
      id: scheduleRef.id,
      ...scheduleData,
      createdAt: new Date().toISOString(), // Use ISO string for client
      updatedAt: new Date().toISOString(), // Use ISO string for client
    };

    return createdResponse(newSchedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    console.error('Create schedule error:', error);
    return errorResponse('Failed to create class schedule');
  }
});

/**
 * Helper function to create a single class instance.
 */
async function createSingleClassInstance(scheduleId: string, schedule: ClassScheduleWithoutIdAndTimestamps) {
  try {
    const instancesCollection = adminDb.collection('classInstances');
    const instanceRef = instancesCollection.doc();

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
      notes: '',
      duration: schedule.duration,
      price: schedule.price,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await instanceRef.set(instanceData);
  } catch (error) {
    console.error('Error creating single class instance:', error);
    throw error;
  }
}

/**
 * Helper function to generate class instances based on new recurrence pattern.
 */
async function generateClassInstances(scheduleId: string, schedule: ClassScheduleWithoutIdAndTimestamps) {
  try {
    if (schedule.recurrence.scheduleType !== 'recurring' ||
        !schedule.recurrence.durationValue ||
        !schedule.recurrence.durationUnit ||
        !schedule.recurrence.daysOfWeek) {
      throw new Error('Invalid recurrence pattern for generating instances.');
    }

    const occurrences = generateRecurringClassDates(
      schedule.startDate,
      schedule.startTime,
      schedule.recurrence.durationValue,
      schedule.recurrence.durationUnit,
      schedule.recurrence.daysOfWeek
    );

    const batch = adminDb.batch();
    const instancesCollection = adminDb.collection('classInstances');

    for (const occurrence of occurrences) {
      const [hours, minutes] = occurrence.time.split(':').map(Number);
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
        date: occurrence.date,
        startTime: occurrence.time,
        endTime,
        maxParticipants: schedule.maxParticipants,
        registeredParticipants: [],
        waitlist: [],
        status: 'scheduled',
        location: schedule.location || '',
        notes: '',
        duration: schedule.duration,
        price: (schedule.price / occurrences.length) || 0, // Distribute package price per session
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(instanceRef, instanceData);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error generating class instances:', error);
    throw error;
  }
}

// PUT /api/classes/schedules/[id] - Update a class schedule
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
    try {
      const { params } = context;
      if (!params?.id) {
        return errorResponse('Schedule ID is required', 400);
      }
  
      const body = await request.json();
      const validatedData = classScheduleSchema.parse(body);
  
      const scheduleRef = adminDb.collection('classSchedules').doc(params.id);
      const scheduleDoc = await scheduleRef.get();
  
      if (!scheduleDoc.exists) {
        return errorResponse('Class schedule not found', 404);
      }
  
      const oldSchedule = scheduleDoc.data() as ClassSchedule; // Cast to ClassSchedule
  
      // Verify instructor exists if changing
      if (validatedData.instructorId && validatedData.instructorId !== oldSchedule.instructorId) {
        const instructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
        if (!instructorDoc.exists) {
          return errorResponse('Instructor not found', 400);
        }
      }
      
      const instructorName = (await adminDb.collection('staff').doc(validatedData.instructorId).get()).data()?.fullName || 'Unknown';
  
      // Construct recurrence pattern based on scheduleType for storage
      const recurrencePattern = validatedData.scheduleType === 'recurring' ? {
        scheduleType: 'recurring' as const,
        daysOfWeek: validatedData.daysOfWeek,
        durationValue: validatedData.recurrenceDurationValue,
        durationUnit: validatedData.recurrenceDurationUnit,
      } : {
        scheduleType: 'single' as const,
      };

      // Determine the price to store in the schedule
      const schedulePrice = validatedData.scheduleType === 'recurring' ? validatedData.packagePrice : validatedData.price;
  
      const updatePayload = {
        name: validatedData.name,
        classType: validatedData.classType,
        instructorId: validatedData.instructorId,
        instructorName,
        maxParticipants: validatedData.maxParticipants,
        duration: validatedData.duration,
        startDate: validatedData.startDate,
        startTime: validatedData.startTime,
        recurrence: recurrencePattern,
        price: schedulePrice || 0,
        updatedAt: FieldValue.serverTimestamp(),
      };
  
      await scheduleRef.update(updatePayload);
  
      // Re-generate instances if recurrence pattern or key schedule details changed
      const shouldRegenerate =
        oldSchedule.recurrence.scheduleType !== validatedData.scheduleType ||
        oldSchedule.startDate !== validatedData.startDate ||
        oldSchedule.startTime !== validatedData.startTime ||
        oldSchedule.duration !== validatedData.duration ||
        (validatedData.scheduleType === 'recurring' &&
          (oldSchedule.recurrence.daysOfWeek?.toString() !== validatedData.daysOfWeek?.toString() ||
           oldSchedule.recurrence.durationValue !== validatedData.recurrenceDurationValue ||
           oldSchedule.recurrence.durationUnit !== validatedData.recurrenceDurationUnit));
  
      if (shouldRegenerate) {
        // Delete existing instances for this schedule
        const existingInstances = await adminDb.collection('classInstances')
          .where('scheduleId', '==', params.id)
          .get();
        const deleteBatch = adminDb.batch();
        existingInstances.docs.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();
  
        // Generate new instances - construct a complete ClassScheduleWithoutIdAndTimestamps
        const scheduleToPass: ClassScheduleWithoutIdAndTimestamps = {
            ...oldSchedule, // Start with old schedule data
            ...updatePayload, // Overlay updated fields
            instructorName, // Ensure updated instructor name is propagated
            recurrence: recurrencePattern, // Overlay new recurrence pattern
            price: schedulePrice || 0, // Overlay new price
            // isActive and createdBy come from oldSchedule as they are not changed via updatePayload
        };

        if (validatedData.scheduleType === 'recurring') {
          await generateClassInstances(params.id, scheduleToPass);
        } else {
          await createSingleClassInstance(params.id, scheduleToPass);
        }
      }
  
      return successResponse(null, 'Class schedule updated successfully');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse('Validation failed', 400, error.errors);
      }
      console.error('Update schedule error:', error);
      return errorResponse('Failed to update class schedule');
    }
});

// DELETE /api/classes/schedules/[id] - Delete a class schedule and its instances
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return errorResponse('Schedule ID is required', 400);
    }

    const scheduleRef = adminDb.collection('classSchedules').doc(params.id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return errorResponse('Class schedule not found', 404);
    }

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

    return successResponse(null, 'Class schedule and its instances deleted successfully');
  } catch (error) {
    console.error('Delete schedule error:', error);
    return errorResponse('Failed to delete class schedule');
  }
});