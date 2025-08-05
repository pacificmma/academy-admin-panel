// src/app/api/classes/schedules/route.ts
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, badRequestResponse, createdResponse } from '@/app/lib/api/response-utils';
import { ClassSchedule, RecurrencePattern } from '@/app/types/class';
import { format as formatFns, addMinutes } from 'date-fns';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for creating a class schedule
const classScheduleSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  classType: z.string().min(1, 'Class type is required'),
  instructorId: z.string().min(1, 'Instructor is required'),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  scheduleType: z.enum(['single', 'recurring']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format').optional(),
  location: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
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

// GET /api/classes/schedules - List all class schedules
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const classType = url.searchParams.get('classType');
    const instructorId = url.searchParams.get('instructorId');
    const isActive = url.searchParams.get('isActive');
    const search = url.searchParams.get('search');

    let query: any = adminDb.collection('classSchedules');

    // Apply filters
    if (classType) {
      query = query.where('classType', '==', classType);
    }
    
    if (instructorId) {
      query = query.where('instructorId', '==', instructorId);
    }
    
    if (isActive !== null) {
      query = query.where('isActive', '==', isActive === 'true');
    }

    // For trainers, only show their own schedules
    if (session.role === 'trainer' || session.role === 'visiting_trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    const snapshot = await query.get();
    const schedules: ClassSchedule[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Skip if doesn't match search term
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = data.name.toLowerCase().includes(searchLower);
        const matchesType = data.classType.toLowerCase().includes(searchLower);
        const matchesInstructor = data.instructorName.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesType && !matchesInstructor) {
          continue;
        }
      }

      const schedule: ClassSchedule = {
        id: doc.id,
        name: data.name,
        classType: data.classType,
        instructorId: data.instructorId,
        instructorName: data.instructorName,
        maxParticipants: data.maxParticipants,
        duration: data.duration,
        startDate: data.startDate,
        startTime: data.startTime,
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
    const scheduleData: any = {
      name: formData.name,
      classType: formData.classType,
      instructorId: formData.instructorId,
      instructorName: instructorData.fullName || 'Unknown Instructor',
      maxParticipants: formData.maxParticipants,
      duration: formData.duration,
      startDate: new Date(formData.startDate).toISOString().split('T')[0],
      startTime: formData.startTime,
      recurrence,
      isActive: true,
      createdBy: session.uid,
    };

    // Only add optional fields if they have values (not undefined)
    if (formData.location !== undefined && formData.location.trim() !== '') {
      scheduleData.location = formData.location.trim();
    }
    
    // Use 'description' from form and store as 'notes' in database
    if (formData.description !== undefined && formData.description.trim() !== '') {
      scheduleData.notes = formData.description.trim();
    }

    // Add to Firestore with server timestamp
    const docRef = await adminDb.collection('classSchedules').add({
      ...scheduleData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 🚀 AUTO-GENERATE CLASS INSTANCES FROM SCHEDULE
    try {
      await generateInstancesFromSchedule(docRef.id, scheduleData, session);
    } catch (instanceError) {
      console.error('Error generating instances:', instanceError);
      // Don't fail the whole operation, just log the error
    }

    // Create the response object with proper optional field handling
    const newSchedule: ClassSchedule = {
      id: docRef.id,
      name: scheduleData.name,
      classType: scheduleData.classType,
      instructorId: scheduleData.instructorId,
      instructorName: scheduleData.instructorName,
      maxParticipants: scheduleData.maxParticipants,
      duration: scheduleData.duration,
      startDate: scheduleData.startDate,
      startTime: scheduleData.startTime,
      recurrence: scheduleData.recurrence,
      location: scheduleData.location || '',
      notes: scheduleData.notes || '',
      isActive: scheduleData.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: scheduleData.createdBy,
      updatedBy: scheduleData.createdBy,
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

// Helper function to generate class instances from a schedule
async function generateInstancesFromSchedule(
  scheduleId: string, 
  scheduleData: any, 
  session: any
): Promise<void> {
  const instances: any[] = [];

  if (scheduleData.recurrence.scheduleType === 'single') {
    // Single instance
    const [hours, minutes] = scheduleData.startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = addMinutes(startDate, scheduleData.duration);
    const endTime = formatFns(endDate, 'HH:mm');

    // Create instance for the exact date specified
    const instanceData: any = {
      scheduleId,
      name: scheduleData.name,
      classType: scheduleData.classType,
      instructorId: scheduleData.instructorId,
      instructorName: scheduleData.instructorName,
      date: scheduleData.startDate,
      startTime: scheduleData.startTime,
      endTime,
      maxParticipants: scheduleData.maxParticipants,
      registeredParticipants: [],
      waitlist: [],
      status: 'scheduled',
      duration: scheduleData.duration,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
    };

    // Add optional fields only if they exist
    if (scheduleData.location && scheduleData.location.trim() !== '') {
      instanceData.location = scheduleData.location;
    }
    if (scheduleData.notes && scheduleData.notes.trim() !== '') {
      instanceData.notes = scheduleData.notes;
    }

    instances.push(instanceData);
  } else if (scheduleData.recurrence.scheduleType === 'recurring') {
    // Generate recurring instances
    const startDate = new Date(scheduleData.startDate);
    const endDate = scheduleData.recurrence.endDate 
      ? new Date(scheduleData.recurrence.endDate) 
      : new Date(startDate.getTime() + (90 * 24 * 60 * 60 * 1000)); // Default to 3 months

    const daysOfWeek = scheduleData.recurrence.daysOfWeek || [];
    let currentDate = new Date(startDate);
    let instanceCount = 0;
    const maxInstances = 50; // Safety limit
    let firstInstanceCreated = false;

    // Calculate end time once
    const [hours, minutes] = scheduleData.startTime.split(':').map(Number);
    const timeStart = new Date();
    timeStart.setHours(hours, minutes, 0, 0);
    const timeEnd = addMinutes(timeStart, scheduleData.duration);
    const endTime = formatFns(timeEnd, 'HH:mm');

    // 🚀 IMPORTANT: If the start date is one of the selected days, create the first instance
    if (daysOfWeek.includes(startDate.getDay())) {
      const firstInstanceData: any = {
        scheduleId,
        name: scheduleData.name,
        classType: scheduleData.classType,
        instructorId: scheduleData.instructorId,
        instructorName: scheduleData.instructorName,
        date: scheduleData.startDate,
        startTime: scheduleData.startTime,
        endTime,
        maxParticipants: scheduleData.maxParticipants,
        registeredParticipants: [],
        waitlist: [],
        status: 'scheduled',
        duration: scheduleData.duration,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: session.uid,
      };

      // Add optional fields only if they exist
      if (scheduleData.location && scheduleData.location.trim() !== '') {
        firstInstanceData.location = scheduleData.location;
      }
      if (scheduleData.notes && scheduleData.notes.trim() !== '') {
        firstInstanceData.notes = scheduleData.notes;
      }

      instances.push(firstInstanceData);
      firstInstanceCreated = true;
      instanceCount++;
    }

    // Now generate the rest of the instances
    if (!firstInstanceCreated) {
      // If first instance wasn't created because start date wasn't in daysOfWeek,
      // find the first matching day
      while (currentDate <= endDate && !daysOfWeek.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Move to next day if we already created the first instance
      currentDate.setDate(currentDate.getDate() + 1);
    }

    while (currentDate <= endDate && instanceCount < maxInstances) {
      if (daysOfWeek.includes(currentDate.getDay())) {
        const instanceData: any = {
          scheduleId,
          name: scheduleData.name,
          classType: scheduleData.classType,
          instructorId: scheduleData.instructorId,
          instructorName: scheduleData.instructorName,
          date: currentDate.toISOString().split('T')[0],
          startTime: scheduleData.startTime,
          endTime,
          maxParticipants: scheduleData.maxParticipants,
          registeredParticipants: [],
          waitlist: [],
          status: 'scheduled',
          duration: scheduleData.duration,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy: session.uid,
        };

        // Add optional fields only if they exist
        if (scheduleData.location && scheduleData.location.trim() !== '') {
          instanceData.location = scheduleData.location;
        }
        if (scheduleData.notes && scheduleData.notes.trim() !== '') {
          instanceData.notes = scheduleData.notes;
        }

        instances.push(instanceData);
        instanceCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Batch create all instances
  if (instances.length > 0) {
    const batch = adminDb.batch();
    
    for (const instance of instances) {
      const docRef = adminDb.collection('classInstances').doc();
      batch.set(docRef, instance);
    }
    
    await batch.commit();
    console.log(`Created ${instances.length} class instances for schedule ${scheduleId}`);
  } else {
    console.warn(`No instances created for schedule ${scheduleId} - check daysOfWeek and date range`);
  }
}

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