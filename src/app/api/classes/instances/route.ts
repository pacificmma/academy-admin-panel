// src/app/api/classes/instances/route.ts - Class Instance Management API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance } from '@/app/types/class';
import { requireAdmin, requireStaffOrTrainer, requireTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse } from '@/app/lib/api/response-utils';
import { getClassTypeColor } from '@/app/types/class'; // FIXED: Add missing import

// GET /api/classes/instances - Get class instances
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    const instructorId = url.searchParams.get('instructorId');

    let query: any = adminDb.collection('classInstances').orderBy('date', 'asc').orderBy('startTime', 'asc');

    // Apply date range filter
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    // Apply status filter
    if (status) {
      query = query.where('status', '==', status);
    }

    // Apply instructor filter
    if (instructorId) {
      query = query.where('instructorId', '==', instructorId);
    }

    // For trainers, only show their assigned classes
    if (session.role === 'trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    const snapshot = await query.get();
    const instances: ClassInstance[] = [];

    snapshot.forEach((doc: { data: () => any; id: any; }) => {
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
        status: data.status,
        location: data.location || '',
        notes: data.notes || '',
        actualDuration: data.actualDuration,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    return successResponse(instances);
  } catch (error) {
    console.error('Get instances error:', error);
    return errorResponse('Failed to load class instances');
  }
});