// src/app/api/classes/schedules/route.ts - COMPLETELY FIXED VERSION
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, ClassScheduleWithoutIdAndTimestamps, RecurrencePattern } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { createdResponse, successResponse, errorResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// FIXED: Enhanced validation schema with correct Zod syntax
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
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurrenceEndDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
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

// GET /api/classes/schedules - Get all class schedules
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    let query = adminDb.collection('classSchedules').orderBy('createdAt', 'desc');

    // Filter by active status unless explicitly requested
    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }

    // If user is trainer, only show classes they're assigned to
    if (session.role === 'trainer' || session.role === 'visiting_trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    const snapshot = await query.get();
    const schedules: ClassSchedule[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get instructor info
      let instructorName = 'Unknown Instructor';
      try {
        const instructorDoc = await adminDb.collection('staff').doc(data.instructorId).get();
        if (instructorDoc.exists) {
          instructorName = instructorDoc.data()?.fullName || 'Unknown Instructor';
        }
      } catch (err) {
        console.error('Error fetching instructor:', err);
      }

      const schedule: ClassSchedule = {
        id: doc.id,
        name: data.name || '',
        classType: data.classType || '',
        instructorId: data.instructorId || '',
        instructorName,
        maxParticipants: data.maxParticipants || 20,
        duration: data.duration || 60,
        startDate: data.startDate || '',
        startTime: data.startTime || '',
        recurrence: data.recurrence || { scheduleType: 'single' },
        location: data.location,
        notes: data.notes,
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdBy: data.createdBy || '',
        updatedBy: data.updatedBy,
      };

      schedules.push(schedule);
    }

    return successResponse(schedules);
  } catch (error) {
    console.error('Error fetching class schedules:', error);
    return errorResponse('Failed to fetch class schedules', 500);
  }
});

// POST /api/classes/schedules - Create new class schedule
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();

    // Validate input
    const validationResult = classScheduleSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return badRequestResponse(firstError?.message || 'Invalid input');
    }

    const formData = validationResult.data;

    // Verify instructor exists and is active
    const instructorDoc = await adminDb.collection('staff').doc(formData.instructorId).get();
    if (!instructorDoc.exists) {
      return badRequestResponse('Selected instructor not found');
    }

    const instructorData = instructorDoc.data()!;
    if (!instructorData.isActive) {
      return badRequestResponse('Selected instructor is not active');
    }

    if (!['trainer', 'visiting_trainer'].includes(instructorData.role)) {
      return badRequestResponse('Selected user is not a trainer');
    }

    // Verify class type exists
    const classTypeQuery = await adminDb.collection('classTypes')
      .where('name', '==', formData.classType)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (classTypeQuery.empty) {
      return badRequestResponse('Selected class type not found or inactive');
    }

    // Build recurrence pattern
    const recurrence: RecurrencePattern = {
      scheduleType: formData.scheduleType,
    };

    if (formData.scheduleType === 'recurring') {
      recurrence.daysOfWeek = formData.daysOfWeek || [];
      if (formData.recurrenceEndDate) {
        recurrence.endDate = new Date(formData.recurrenceEndDate).toISOString();
      }
    }

    // Create class schedule data
    const scheduleData: ClassScheduleWithoutIdAndTimestamps = {
      name: formData.name,
      classType: formData.classType,
      instructorId: formData.instructorId,
      instructorName: instructorData.fullName || 'Unknown Instructor',
      maxParticipants: formData.maxParticipants,
      duration: formData.duration,
      startDate: new Date(formData.startDate).toISOString().split('T')[0],
      startTime: formData.startTime,
      recurrence,
      location: formData.location,
      notes: formData.notes,
      isActive: true,
      createdBy: session.uid,
    };

    // Add to Firestore with server timestamp
    const docRef = await adminDb.collection('classSchedules').add({
      ...scheduleData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create the response object
    const newSchedule: ClassSchedule = {
      id: docRef.id,
      ...scheduleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return createdResponse(newSchedule);
  } catch (error) {
    console.error('Error creating class schedule:', error);
    
    if (error instanceof z.ZodError) {
      return badRequestResponse('Validation failed: ' + error.errors[0]?.message);
    }
    
    return errorResponse('Failed to create class schedule', 500);
  }
});

// Helper function to validate date format
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

// Helper function to validate time format
function isValidTime(timeString: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
}