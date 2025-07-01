// src/app/api/classes/schedules/route.ts - Class Schedule Management API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassSchedule, ClassFormData, getNextOccurrences } from '@/app/types/class';
import { z } from 'zod';
import { requireAuth, RequestContext } from '@/app/lib/api/middleware';
import { createdResponse, successResponse, errorResponse } from '@/app/lib/api/response-utils';

// Validation schema for class schedule
const classScheduleSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  classType: z.enum(['MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts']),
  instructorId: z.string().min(1),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  recurrence: z.object({
    type: z.enum(['none', 'daily', 'weekly', 'monthly']),
    interval: z.number().int().min(1).max(12),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    occurrences: z.number().int().min(1).max(365).optional(),
  }),
  location: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  price: z.number().min(0).optional(),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced', 'All Levels']).optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/classes/schedules - Get all class schedules
export const GET = requireAuth(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const classType = url.searchParams.get('classType');
    const instructorId = url.searchParams.get('instructorId');

    let query = adminDb.collection('classSchedules')
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
export const POST = requireAuth(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;

    // Only admins can create schedules
    if (session.role !== 'admin') {
      return errorResponse('Unauthorized', 403);
    }

    const body = await request.json();
    const validatedData = classScheduleSchema.parse(body);

    // Verify instructor exists
    const instructorDoc = await adminDb.collection('staff').doc(validatedData.instructorId).get();
    if (!instructorDoc.exists) {
      return errorResponse('Instructor not found', 400);
    }

    const instructorData = instructorDoc.data();
    const instructorName = instructorData?.fullName || 'Unknown';

    // Create the schedule document
    const scheduleData: Omit<ClassSchedule, 'id'> = {
      ...validatedData,
      instructorName,
      isActive: true,
      createdBy: session.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const scheduleRef = await adminDb.collection('classSchedules').add({
      ...scheduleData,
      createdAt: adminDb.collection('classSchedules').doc().firestore.FieldValue.serverTimestamp(),
      updatedAt: adminDb.collection('classSchedules').doc().firestore.FieldValue.serverTimestamp(),
    });

    // Generate class instances based on recurrence
    await generateClassInstances(scheduleRef.id, scheduleData);

    const newSchedule: ClassSchedule = {
      id: scheduleRef.id,
      ...scheduleData,
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

// Helper function to generate class instances
async function generateClassInstances(scheduleId: string, schedule: Omit<ClassSchedule, 'id'>) {
  try {
    const occurrences = getNextOccurrences(
      schedule.startDate,
      schedule.startTime,
      schedule.recurrence,
      schedule.recurrence.occurrences || 52 // Default to 1 year of weekly classes
    );

    const batch = adminDb.batch();
    const instancesCollection = adminDb.collection('classInstances');

    for (const occurrence of occurrences) {
      const [hours, minutes] = schedule.startTime.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + schedule.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

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
        createdAt: adminDb.collection('classInstances').doc().firestore.FieldValue.serverTimestamp(),
        updatedAt: adminDb.collection('classInstances').doc().firestore.FieldValue.serverTimestamp(),
      };

      batch.set(instanceRef, instanceData);
    }

    await batch.commit();
  } catch (error) {
    console.error('Error generating class instances:', error);
  }
}