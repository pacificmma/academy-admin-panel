// src/app/api/classes/schedules/route.ts - Class Schedule Management API (GET and POST only)
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, generateRecurringClassDates, ClassScheduleWithoutIdAndTimestamps, RecurrencePattern } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { createdResponse, successResponse, errorResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// Validation schema for class schedule
const classScheduleSchema = z.object({
  name: z.string().min(3).max(100),
  classType: z.string().min(1),
  instructorId: z.string().min(1),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  scheduleType: z.enum(['single', 'recurring']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // ADD THIS LINE
  location: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.scheduleType === 'recurring') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one day must be selected for recurring events',
        path: ['daysOfWeek'],
      });
    }
    
    // ADD THIS VALIDATION:
    if (data.recurrenceEndDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.recurrenceEndDate);
      
      if (endDate <= startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Recurrence end date must be after start date',
          path: ['recurrenceEndDate'],
        });
      }
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
    return errorResponse('Failed to load class schedules', 500);
  }
});

// POST /api/classes/schedules - Create new class schedule
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();
    
    const validationResult = classScheduleSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return errorResponse(firstError?.message || 'Invalid input', 400);
    }

    const validatedData = validationResult.data;

    // Verify instructor exists
    const instructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
    if (!instructorDoc.exists) {
      return errorResponse('Instructor not found', 400);
    }

    const instructorData = instructorDoc.data();
    const instructorName = instructorData?.fullName || 'Unknown';

    // Construct recurrence pattern based on scheduleType
    const recurrencePattern: RecurrencePattern = validatedData.scheduleType === 'recurring' ? {
      scheduleType: 'recurring' as const,
      daysOfWeek: validatedData.daysOfWeek,
      endDate: validatedData.recurrenceEndDate, // ADD THIS LINE
    } : {
      scheduleType: 'single' as const,
    };

    const scheduleData: ClassScheduleWithoutIdAndTimestamps = {
      name: validatedData.name,
      classType: validatedData.classType,
      instructorId: validatedData.instructorId,
      instructorName,
      maxParticipants: validatedData.maxParticipants,
      duration: validatedData.duration,
      startDate: validatedData.startDate,
      startTime: validatedData.startTime,
      recurrence: recurrencePattern,
      location: validatedData.location || '',
      notes: validatedData.notes || '',
      isActive: true,
      createdBy: session.uid,
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
      await createSingleClassInstance(scheduleRef.id, scheduleData);
    }

    const newSchedule: ClassSchedule = {
      id: scheduleRef.id,
      ...scheduleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return createdResponse(newSchedule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    console.error('Create schedule error:', error);
    return errorResponse('Failed to create class schedule', 500);
  }
});

// Helper function to create a single class instance
async function createSingleClassInstance(scheduleId: string, schedule: ClassScheduleWithoutIdAndTimestamps) {
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

// Helper function to generate recurring class instances
async function generateClassInstances(scheduleId: string, schedule: ClassScheduleWithoutIdAndTimestamps) {
  try {
    if (schedule.recurrence.scheduleType !== 'recurring' || !schedule.recurrence.daysOfWeek) {
      throw new Error('Invalid recurrence pattern for generating instances.');
    }

    // Use the endDate from recurrence pattern if provided, otherwise default to 3 months
    const today = new Date();
    let endDate: Date;
    
    if (schedule.recurrence.endDate) {
      endDate = new Date(schedule.recurrence.endDate);
    } else {
      endDate = new Date();
      endDate.setMonth(today.getMonth() + 3); // Default to 3 months
    }

    const batch = adminDb.batch();
    const instancesCollection = adminDb.collection('classInstances');
    
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