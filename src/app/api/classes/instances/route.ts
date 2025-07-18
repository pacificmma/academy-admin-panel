// src/app/api/classes/instances/route.ts - COMPLETELY FIXED VERSION
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, badRequestResponse, createdResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

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
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();
    
    // Validate input
    const validationResult = createInstanceSchema.safeParse(body);
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

    // Calculate end time
    const [hours, minutes] = formData.startTime.split(':');
    const startDate = new Date();
    startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    const endDate = addMinutes(startDate, formData.duration);
    const endTime = formatFns(endDate, 'HH:mm');

    // Create instance data
    const instanceData = {
      scheduleId: formData.scheduleId || null,
      name: formData.name,
      classType: formData.classType,
      instructorId: formData.instructorId,
      instructorName: instructorData.fullName || 'Unknown Instructor',
      date: formData.date,
      startTime: formData.startTime,
      endTime,
      maxParticipants: formData.maxParticipants,
      registeredParticipants: [],
      waitlist: [],
      status: 'scheduled',
      location: formData.location || '',
      notes: formData.notes || '',
      duration: formData.duration,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
    };

    // Add to Firestore
    const docRef = await adminDb.collection('classInstances').add(instanceData);

    // Create response object
    const newInstance: ClassInstance = {
      id: docRef.id,
      scheduleId: formData.scheduleId || '',
      name: formData.name,
      classType: formData.classType,
      instructorId: formData.instructorId,
      instructorName: instructorData.fullName || 'Unknown Instructor',
      date: formData.date,
      startTime: formData.startTime,
      endTime,
      maxParticipants: formData.maxParticipants,
      registeredParticipants: [],
      waitlist: [],
      status: 'scheduled',
      location: formData.location || '',
      notes: formData.notes || '',
      duration: formData.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return createdResponse(newInstance);
  } catch (error) {
    console.error('Error creating class instance:', error);
    
    if (error instanceof z.ZodError) {
      return badRequestResponse('Validation failed: ' + error.errors[0]?.message);
    }
    
    return errorResponse('Failed to create class instance', 500);
  }
});