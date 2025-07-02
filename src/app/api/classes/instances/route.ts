// src/app/api/classes/instances/route.ts (CORRECTED VERSION)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance, ClassStatus } from '@/app/types/class';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { addMinutes, format as formatFns } from 'date-fns';

// Validation schema for updating class instances
const updateInstanceSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  classType: z.enum(['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts', 'All Access']).optional(),
  instructorId: z.string().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
  duration: z.number().int().min(15).max(240).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
});

// Validation schema for cancelling instances
const cancelInstanceSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
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
    if (session.role === 'trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    // Order by date and time
    query = query.orderBy('date', 'asc').orderBy('startTime', 'asc');

    const snapshot = await query.get();
    let instances: ClassInstance[] = [];

    snapshot.forEach((doc: any) => { // FIXED: Removed type annotation
      const data = doc.data();
      instances.push({
        id: doc.id,
        scheduleId: data.scheduleId,
        name: data.name,
        classType: data.classType,
        instructorId: data.instructorId,
        instructorName: data.instructorName,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        maxParticipants: data.maxParticipants,
        registeredParticipants: data.registeredParticipants || [],
        waitlist: data.waitlist || [],
        status: data.status as ClassStatus,
        location: data.location || '',
        notes: data.notes || '',
        duration: data.duration,
        actualDuration: data.actualDuration,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    // Apply search filtering after database query (since it's a complex filter)
    if (search) {
      const searchLower = search.toLowerCase();
      instances = instances.filter(instance =>
        instance.name.toLowerCase().includes(searchLower) ||
        instance.instructorName.toLowerCase().includes(searchLower) ||
        instance.classType.toLowerCase().includes(searchLower) ||
        instance.notes?.toLowerCase().includes(searchLower) ||
        instance.location?.toLowerCase().includes(searchLower)
      );
    }

    return successResponse(instances);
  } catch (error) {
    console.error('Get instances error:', error);
    return errorResponse('Failed to fetch class instances');
  }
});

// POST /api/classes/instances - Create a new class instance
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'classType', 'instructorId', 'date', 'startTime', 'duration', 'maxParticipants'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return errorResponse(`${field} is required`, 400);
      }
    }

    // Verify instructor exists
    const instructorDoc = await adminDb.collection('staff').doc(body.instructorId).get();
    if (!instructorDoc.exists) {
      return errorResponse('Instructor not found', 400);
    }

    const instructorName = instructorDoc.data()?.fullName || 'Unknown';

    // Calculate end time
    const [hours, minutes] = body.startTime.split(':').map(Number);
    const startTimeDate = new Date();
    startTimeDate.setHours(hours, minutes, 0, 0);
    const endTimeDate = addMinutes(startTimeDate, body.duration);
    const endTime = formatFns(endTimeDate, 'HH:mm');

    const instanceData = {
      scheduleId: body.scheduleId || null,
      name: body.name,
      classType: body.classType,
      instructorId: body.instructorId,
      instructorName,
      date: body.date,
      startTime: body.startTime,
      endTime,
      maxParticipants: body.maxParticipants,
      registeredParticipants: [],
      waitlist: [],
      status: 'scheduled' as ClassStatus, // FIXED: Added explicit type assertion
      location: body.location || '',
      notes: body.notes || '',
      duration: body.duration,
      createdBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const instanceRef = await adminDb.collection('classInstances').add(instanceData);

    // FIXED: Explicit object construction instead of spread operator
    const newInstance: ClassInstance = {
      id: instanceRef.id,
      scheduleId: instanceData.scheduleId,
      name: instanceData.name,
      classType: instanceData.classType,
      instructorId: instanceData.instructorId,
      instructorName: instanceData.instructorName,
      date: instanceData.date,
      startTime: instanceData.startTime,
      endTime: instanceData.endTime,
      maxParticipants: instanceData.maxParticipants,
      registeredParticipants: instanceData.registeredParticipants,
      waitlist: instanceData.waitlist,
      status: instanceData.status,
      location: instanceData.location,
      notes: instanceData.notes,
      duration: instanceData.duration,
      actualDuration: undefined, // FIXED: Added missing field
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return successResponse(newInstance, 'Class instance created successfully');
  } catch (error) {
    console.error('Create instance error:', error);
    return errorResponse('Failed to create class instance');
  }
});