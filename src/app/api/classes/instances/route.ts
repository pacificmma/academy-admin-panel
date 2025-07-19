// src/app/api/classes/instances/route.ts - COMPLETELY FIXED VERSION
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance, ClassSchedule, RecurrencePattern } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, badRequestResponse, createdResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';
import { classScheduleSchema } from '@/app/lib/validations/membership';

// FIXED: Validation schema for creating class instances
const createInstanceSchema = z.object({
  name: z.string().min(3).max(100),
  classType: z.string().min(1, 'Class type is required'),
  instructorId: z.string().min(1, 'Instructor is required'),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
  location: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  scheduleId: z.string().optional(), // Optional reference to parent schedule
});

// FIXED: Validation schema for updating class instances
const updateInstanceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  classType: z.string().min(1).optional(),
  instructorId: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
});

// GET /api/classes/instances - List class instances with filtering
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    
    // Extract query parameters
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const classType = url.searchParams.get('classType');
    const instructorId = url.searchParams.get('instructorId');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let query: any = adminDb.collection('classInstances');

    // Apply filters
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    
    if (classType) {
      query = query.where('classType', '==', classType);
    }
    
    if (instructorId) {
      query = query.where('instructorId', '==', instructorId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }

    // For trainers, only show their assigned instances
    if (session.role === 'trainer' || session.role === 'visiting_trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    // Order by date and time
    query = query.orderBy('date', 'asc').orderBy('startTime', 'asc');

    const snapshot = await query.get();
    const instances: ClassInstance[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get instructor name if not already stored
      let instructorName = data.instructorName || 'Unknown Instructor';
      if (!data.instructorName && data.instructorId) {
        try {
          const instructorDoc = await adminDb.collection('staff').doc(data.instructorId).get();
          if (instructorDoc.exists) {
            instructorName = instructorDoc.data()?.fullName || 'Unknown Instructor';
          }
        } catch (err) {
          console.error('Error fetching instructor:', err);
        }
      }

      // Calculate end time if not stored
      let endTime = data.endTime;
      if (!endTime && data.startTime && data.duration) {
        try {
          const [hours, minutes] = data.startTime.split(':');
          const startDate = new Date();
          startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          const endDate = addMinutes(startDate, data.duration);
          endTime = formatFns(endDate, 'HH:mm');
        } catch (err) {
          endTime = data.startTime;
        }
      }

      const instance: ClassInstance = {
        id: doc.id,
        scheduleId: data.scheduleId || '',
        name: data.name || '',
        classType: data.classType || '',
        instructorId: data.instructorId || '',
        instructorName,
        date: data.date || '',
        startTime: data.startTime || '',
        endTime: endTime || '',
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

      instances.push(instance);
    }

    // Apply search filtering after database query (since it's a complex filter)
    let filteredInstances = instances;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInstances = instances.filter(instance =>
        instance.name.toLowerCase().includes(searchLower) ||
        instance.instructorName.toLowerCase().includes(searchLower) ||
        instance.classType.toLowerCase().includes(searchLower) ||
        instance.notes?.toLowerCase().includes(searchLower) ||
        instance.location?.toLowerCase().includes(searchLower)
      );
    }

    return successResponse(filteredInstances);
  } catch (error) {
    console.error('Error fetching class instances:', error);
    return errorResponse('Failed to fetch class instances', 500);
  }
});

// POST /api/classes/instances - Create a new class instance
// ONLY THE CHANGED PARTS OF src/app/api/classes/schedules/route.ts

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

    // FIXED: Create class schedule data with proper undefined handling
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

    // FIXED: Only add optional fields if they have values (not undefined)
    if (formData.location !== undefined && formData.location.trim() !== '') {
      scheduleData.location = formData.location.trim();
    }
    
    if (formData.description !== undefined && formData.description.trim() !== '') {
      scheduleData.notes = formData.description.trim();
    }

    // Add to Firestore with server timestamp
    const docRef = await adminDb.collection('classSchedules').add({
      ...scheduleData,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // FIXED: Create the response object with proper optional field handling
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
      location: scheduleData.location || '', // Provide default empty string for response
      notes: scheduleData.notes || '', // Store as 'notes' in database but read from 'description' in form
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