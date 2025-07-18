// src/app/api/classes/schedules/route.ts - FIXED VERSION
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, ClassScheduleWithoutIdAndTimestamps, RecurrencePattern } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { createdResponse, successResponse, errorResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// FIXED: Enhanced validation schema with better error messages
const classScheduleSchema = z.object({
  name: z.string()
    .min(3, 'Class name must be at least 3 characters')
    .max(100, 'Class name must be less than 100 characters')
    .trim(),
  classType: z.string()
    .min(1, 'Class type is required')
    .trim(),
  instructorId: z.string()
    .min(1, 'Instructor is required'),
  maxParticipants: z.number()
    .int('Max participants must be a whole number')
    .min(1, 'At least 1 participant required')
    .max(100, 'Maximum 100 participants allowed'),
  duration: z.number()
    .int('Duration must be a whole number')
    .min(15, 'Minimum 15 minutes required')
    .max(240, 'Maximum 4 hours allowed'),
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  startTime: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Invalid time format, use HH:MM'),
  scheduleType: z.enum(['single', 'recurring'], {
    errorMap: () => ({ message: 'Schedule type must be either single or recurring' })
  }),
  daysOfWeek: z.array(z.number().int().min(0).max(6))
    .optional(),
  recurrenceEndDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format, use YYYY-MM-DD')
    .optional(),
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .optional(),
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
}).superRefine((data, ctx) => {
  // Validate recurring schedule requirements
  if (data.scheduleType === 'recurring') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one day must be selected for recurring events',
        path: ['daysOfWeek'],
      });
    }
    
    // Validate recurrence end date
    if (data.recurrenceEndDate) {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.recurrenceEndDate);
      
      if (endDate <= startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date',
          path: ['recurrenceEndDate'],
        });
      }
      
      // Validate end date is not too far in the future (max 2 years)
      const maxDate = new Date(startDate);
      maxDate.setFullYear(maxDate.getFullYear() + 2);
      if (endDate > maxDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date cannot be more than 2 years from start date',
          path: ['recurrenceEndDate'],
        });
      }
    }
  }
  
  // Validate start date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inputDate = new Date(data.startDate);
  
  if (inputDate < today) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Start date cannot be in the past',
      path: ['startDate'],
    });
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

    // FIXED: Better error handling for instructor lookup
    for (const doc of snapshot.docs) {
      const data = doc.data();

      let instructorName = 'Unknown';
      try {
        const instructorDoc = await adminDb.collection('staff').doc(data.instructorId).get();
        if (instructorDoc.exists) {
          instructorName = instructorDoc.data()?.fullName || 'Unknown';
        }
      } catch (error) {
        console.error(`Error fetching instructor ${data.instructorId}:`, error);
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
        schedule.notes?.toLowerCase().includes(searchLower)
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
    
    // FIXED: Better error handling for JSON parsing
    if (!body || typeof body !== 'object') {
      return errorResponse('Invalid request body', 400);
    }
    
    // Validate input data
    const validationResult = classScheduleSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors;
      const firstError = errors[0];
      
      // Return detailed validation errors
      return errorResponse(
        `Validation failed: ${firstError?.message || 'Invalid input'}`,
        400,
        {
          validationErrors: errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      );
    }

    const validatedData = validationResult.data;

    // FIXED: Enhanced instructor validation
    let instructorDoc;
    try {
      instructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
    } catch (error) {
      console.error('Error fetching instructor:', error);
      return errorResponse('Failed to validate instructor', 500);
    }

    if (!instructorDoc.exists) {
      return errorResponse('Instructor not found', 400);
    }

    const instructorData = instructorDoc.data();
    if (!instructorData?.isActive) {
      return errorResponse('Instructor is not active', 400);
    }

    const instructorName = instructorData.fullName || 'Unknown';

    // FIXED: Safer recurrence pattern construction - NO undefined values
    let recurrencePattern: RecurrencePattern;
    
    if (validatedData.scheduleType === 'recurring') {
      recurrencePattern = {
        scheduleType: 'recurring' as const,
        daysOfWeek: validatedData.daysOfWeek || [],
        // Only include endDate if it exists - Firestore doesn't accept undefined
        ...(validatedData.recurrenceEndDate && { endDate: validatedData.recurrenceEndDate }),
      };
    } else {
      recurrencePattern = {
        scheduleType: 'single' as const,
      };
    }

    // FIXED: Explicit data construction to avoid spreading issues
    const scheduleData: ClassScheduleWithoutIdAndTimestamps = {
      name: validatedData.name.trim(),
      classType: validatedData.classType.trim(),
      instructorId: validatedData.instructorId,
      instructorName,
      maxParticipants: validatedData.maxParticipants,
      duration: validatedData.duration,
      startDate: validatedData.startDate,
      startTime: validatedData.startTime,
      recurrence: recurrencePattern,
      location: validatedData.location?.trim() || '',
      notes: validatedData.notes?.trim() || '',
      isActive: true,
      createdBy: session.uid,
    };

    // FIXED: Safer database write - NO undefined values for Firestore
    let scheduleRef;
    try {
      // Create the database object without undefined values
      const dbData: any = {
        name: scheduleData.name,
        classType: scheduleData.classType,
        instructorId: scheduleData.instructorId,
        instructorName: scheduleData.instructorName,
        maxParticipants: scheduleData.maxParticipants,
        duration: scheduleData.duration,
        startDate: scheduleData.startDate,
        startTime: scheduleData.startTime,
        recurrence: {
          scheduleType: scheduleData.recurrence.scheduleType,
          // Only include fields that have values
          ...(scheduleData.recurrence.daysOfWeek && { daysOfWeek: scheduleData.recurrence.daysOfWeek }),
          ...(scheduleData.recurrence.endDate && { endDate: scheduleData.recurrence.endDate }),
        },
        isActive: scheduleData.isActive,
        createdBy: scheduleData.createdBy,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Only include optional fields if they have non-empty values
      if (scheduleData.location && scheduleData.location.trim()) {
        dbData.location = scheduleData.location;
      }
      
      if (scheduleData.notes && scheduleData.notes.trim()) {
        dbData.notes = scheduleData.notes;
      }

      scheduleRef = await adminDb.collection('classSchedules').add(dbData);
    } catch (error) {
      console.error('Error creating schedule document:', error);
      return errorResponse('Failed to create class schedule in database', 500);
    }

    // Generate class instances based on schedule type
    try {
      if (scheduleData.recurrence.scheduleType === 'recurring') {
        await generateClassInstances(scheduleRef.id, scheduleData);
      } else {
        await createSingleClassInstance(scheduleRef.id, scheduleData);
      }
    } catch (error) {
      console.error('Error generating class instances:', error);
      
      // Clean up the schedule if instance generation fails
      try {
        await scheduleRef.delete();
      } catch (cleanupError) {
        console.error('Error cleaning up failed schedule:', cleanupError);
      }
      
      return errorResponse('Failed to generate class instances', 500);
    }

    // FIXED: Explicit response construction
    const newSchedule: ClassSchedule = {
      id: scheduleRef.id,
      name: scheduleData.name,
      classType: scheduleData.classType,
      instructorId: scheduleData.instructorId,
      instructorName: scheduleData.instructorName,
      maxParticipants: scheduleData.maxParticipants,
      duration: scheduleData.duration,
      startDate: scheduleData.startDate,
      startTime: scheduleData.startTime,
      recurrence: scheduleData.recurrence,
      location: scheduleData.location,
      notes: scheduleData.notes,
      isActive: scheduleData.isActive,
      createdBy: scheduleData.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return createdResponse(newSchedule);
  } catch (error) {
    console.error('Create schedule error:', error);
    
    // FIXED: Better error categorization
    if (error instanceof z.ZodError) {
      return errorResponse('Validation failed', 400, {
        validationErrors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    
    if (error instanceof SyntaxError) {
      return errorResponse('Invalid JSON in request body', 400);
    }
    
    return errorResponse('Failed to create class schedule', 500);
  }
});

// FIXED: Enhanced helper function with better error handling
async function createSingleClassInstance(scheduleId: string, schedule: ClassScheduleWithoutIdAndTimestamps) {
  try {
    // Parse and validate time
    const timeParts = schedule.startTime.split(':');
    if (timeParts.length !== 2) {
      throw new Error('Invalid start time format');
    }
    
    const [hours, minutes] = timeParts.map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error('Invalid start time values');
    }

    const startTimeDate = new Date();
    startTimeDate.setHours(hours, minutes, 0, 0);
    const endTimeDate = addMinutes(startTimeDate, schedule.duration);
    const endTime = formatFns(endTimeDate, 'HH:mm');

    // FIXED: Declare as any type to allow dynamic property addition
    const instanceData: any = {
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
      duration: schedule.duration,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Only add optional fields if they have values
    if (schedule.location && schedule.location.trim()) {
      instanceData.location = schedule.location;
    }
    
    if (schedule.notes && schedule.notes.trim()) {
      instanceData.notes = schedule.notes;
    }

    await adminDb.collection('classInstances').add(instanceData);
  } catch (error) {
    console.error('Error creating single class instance:', error);
    throw new Error(`Failed to create class instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// FIXED: Enhanced recurring instances generation with better validation
async function generateClassInstances(scheduleId: string, schedule: ClassScheduleWithoutIdAndTimestamps) {
  try {
    if (schedule.recurrence.scheduleType !== 'recurring' || !schedule.recurrence.daysOfWeek) {
      throw new Error('Invalid recurrence pattern for generating instances');
    }

    const today = new Date();
    let endDate: Date;
    
    // FIXED: Enhanced recurring instances generation - NO undefined values
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
    
    // Parse time once for efficiency
    const [hours, minutes] = schedule.startTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error('Invalid start time format');
    }

    const startTimeDate = new Date();
    startTimeDate.setHours(hours, minutes, 0, 0);
    const endTimeDate = addMinutes(startTimeDate, schedule.duration);
    const endTime = formatFns(endTimeDate, 'HH:mm');
    
    let instanceCount = 0;
    const maxInstances = 500; // Prevent infinite loops
    
    while (currentDate <= endDate && instanceCount < maxInstances) {
      if (daysOfWeek.includes(currentDate.getDay())) {
        const instanceRef = instancesCollection.doc();
        
        // FIXED: Declare as any type to allow dynamic property addition
        const instanceData: any = {
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
          duration: schedule.duration,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Only add optional fields if they have values
        if (schedule.location && schedule.location.trim()) {
          instanceData.location = schedule.location;
        }
        
        if (schedule.notes && schedule.notes.trim()) {
          instanceData.notes = schedule.notes;
        }

        batch.set(instanceRef, instanceData);
        instanceCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (instanceCount === 0) {
      throw new Error('No instances would be created with the given recurrence pattern');
    }

    await batch.commit();
    console.log(`Generated ${instanceCount} class instances for schedule ${scheduleId}`);
  } catch (error) {
    console.error('Error generating class instances:', error);
    throw new Error(`Failed to generate class instances: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}