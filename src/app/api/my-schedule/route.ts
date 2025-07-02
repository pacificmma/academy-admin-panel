// src/app/api/my-schedule/route.ts
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse } from '@/app/lib/api/response-utils';
import { ClassInstance } from '@/app/types/class';

// GET /api/my-schedule - Get current user's schedule
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    
    // Get date range from query params
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    let query: any = adminDb.collection('classInstances');
    
    // Apply date filtering if provided
    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    
    // For trainers, only show their classes
    if (session.role === 'trainer') {
      query = query.where('instructorId', '==', session.uid);
    }

    const snapshot = await query.orderBy('date').orderBy('startTime').get();
    const scheduleItems: ClassInstance[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data() as Omit<ClassInstance, 'id'>;
      scheduleItems.push({
        id: doc.id,
        ...data
      });
    });

    return successResponse({
      items: scheduleItems,
      total: scheduleItems.length
    });

  } catch (error) {
    console.error('My Schedule API error:', error);
    return errorResponse('Failed to load schedule');
  }
});