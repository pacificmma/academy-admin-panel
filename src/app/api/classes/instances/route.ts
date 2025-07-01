// src/app/api/classes/instances/route.ts - Class Instance Management API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { ClassInstance } from '@/app/types/class';
import { requireAuth, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse } from '@/app/lib/api/response-utils';

// GET /api/classes/instances - Get class instances
export const GET = requireAuth(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const status = url.searchParams.get('status');
    const instructorId = url.searchParams.get('instructorId');

    let query = adminDb.collection('classInstances').orderBy('date', 'asc').orderBy('startTime', 'asc');

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

    snapshot.forEach(doc => {
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

// src/app/api/classes/instances/[id]/route.ts - Individual Class Instance Management
export async function GET_INSTANCE(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (request: NextRequest, context: RequestContext) => {
    try {
      const instanceDoc = await adminDb.collection('classInstances').doc(params.id).get();
      
      if (!instanceDoc.exists) {
        return errorResponse('Class instance not found', 404);
      }

      const data = instanceDoc.data()!;
      const instance: ClassInstance = {
        id: instanceDoc.id,
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
      };

      return successResponse(instance);
    } catch (error) {
      console.error('Get instance error:', error);
      return errorResponse('Failed to load class instance');
    }
  })(request, { session: context.session });
}

// src/app/api/classes/instances/[id]/start/route.ts - Start Class Instance
export async function POST_START_CLASS(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (request: NextRequest, context: RequestContext) => {
    try {
      const { session } = context;
      const instanceRef = adminDb.collection('classInstances').doc(params.id);
      const instanceDoc = await instanceRef.get();

      if (!instanceDoc.exists) {
        return errorResponse('Class instance not found', 404);
      }

      const data = instanceDoc.data()!;

      // Check if user can manage this class
      if (session.role !== 'admin' && data.instructorId !== session.uid) {
        return errorResponse('Unauthorized', 403);
      }

      // Check if class can be started
      if (data.status !== 'scheduled') {
        return errorResponse('Class cannot be started', 400);
      }

      await instanceRef.update({
        status: 'ongoing',
        updatedAt: adminDb.collection('classInstances').doc().firestore.FieldValue.serverTimestamp(),
      });

      return successResponse({ message: 'Class started successfully' });
    } catch (error) {
      console.error('Start class error:', error);
      return errorResponse('Failed to start class');
    }
  })(request, { session: context.session });
}

// src/app/api/classes/instances/[id]/end/route.ts - End Class Instance
export async function POST_END_CLASS(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (request: NextRequest, context: RequestContext) => {
    try {
      const { session } = context;
      const body = await request.json();
      const { actualDuration, notes } = body;

      const instanceRef = adminDb.collection('classInstances').doc(params.id);
      const instanceDoc = await instanceRef.get();

      if (!instanceDoc.exists) {
        return errorResponse('Class instance not found', 404);
      }

      const data = instanceDoc.data()!;

      // Check if user can manage this class
      if (session.role !== 'admin' && data.instructorId !== session.uid) {
        return errorResponse('Unauthorized', 403);
      }

      // Check if class can be ended
      if (data.status !== 'ongoing') {
        return errorResponse('Class cannot be ended', 400);
      }

      const updateData: any = {
        status: 'completed',
        updatedAt: adminDb.collection('classInstances').doc().firestore.FieldValue.serverTimestamp(),
      };

      if (actualDuration) {
        updateData.actualDuration = actualDuration;
      }

      if (notes) {
        updateData.notes = notes;
      }

      await instanceRef.update(updateData);

      return successResponse({ message: 'Class ended successfully' });
    } catch (error) {
      console.error('End class error:', error);
      return errorResponse('Failed to end class');
    }
  })(request, { session: context.session });
}

// src/app/api/classes/instances/[id]/cancel/route.ts - Cancel Class Instance
export async function POST_CANCEL_CLASS(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (request: NextRequest, context: RequestContext) => {
    try {
      const { session } = context;
      const body = await request.json();
      const { reason } = body;

      const instanceRef = adminDb.collection('classInstances').doc(params.id);
      const instanceDoc = await instanceRef.get();

      if (!instanceDoc.exists) {
        return errorResponse('Class instance not found', 404);
      }

      const data = instanceDoc.data()!;

      // Check if user can manage this class
      if (session.role !== 'admin' && data.instructorId !== session.uid) {
        return errorResponse('Unauthorized', 403);
      }

      // Check if class can be cancelled
      if (data.status === 'completed' || data.status === 'cancelled') {
        return errorResponse('Class cannot be cancelled', 400);
      }

      const updateData: any = {
        status: 'cancelled',
        updatedAt: adminDb.collection('classInstances').doc().firestore.FieldValue.serverTimestamp(),
      };

      if (reason) {
        updateData.cancellationReason = reason;
      }

      await instanceRef.update(updateData);

      // TODO: Send notifications to registered participants about cancellation

      return successResponse({ message: 'Class cancelled successfully' });
    } catch (error) {
      console.error('Cancel class error:', error);
      return errorResponse('Failed to cancel class');
    }
  })(request, { session: context.session });
}

// src/app/api/classes/instances/[id]/participants/route.ts - Manage Class Participants
export async function GET_PARTICIPANTS(request: NextRequest, { params }: { params: { id: string } }) {
  return requireAuth(async (request: NextRequest, context: RequestContext) => {
    try {
      const instanceDoc = await adminDb.collection('classInstances').doc(params.id).get();
      
      if (!instanceDoc.exists) {
        return errorResponse('Class instance not found', 404);
      }

      const data = instanceDoc.data()!;
      const participantIds = [...(data.registeredParticipants || []), ...(data.waitlist || [])];
      
      if (participantIds.length === 0) {
        return successResponse({ registered: [], waitlist: [] });
      }

      // Get participant details
      const membersSnapshot = await adminDb.collection('members')
        .where(adminDb.collection('members').doc().firestore.FieldPath.documentId(), 'in', participantIds)
        .get();

      const memberMap = new Map();
      membersSnapshot.forEach(doc => {
        memberMap.set(doc.id, {
          id: doc.id,
          ...doc.data(),
        });
      });

      const registered = (data.registeredParticipants || []).map((id: string) => memberMap.get(id)).filter(Boolean);
      const waitlist = (data.waitlist || []).map((id: string) => memberMap.get(id)).filter(Boolean);

      return successResponse({ registered, waitlist });
    } catch (error) {
      console.error('Get participants error:', error);
      return errorResponse('Failed to load participants');
    }
  })(request, { session: context.session });
}

// src/app/api/classes/stats/route.ts - Class Statistics
export async function GET_STATS(request: NextRequest) {
  return requireAuth(async (request: NextRequest, context: RequestContext) => {
    try {
      const { session } = context;

      // Only admins can view full stats
      if (session.role !== 'admin') {
        return errorResponse('Unauthorized', 403);
      }

      // Get total classes (schedules)
      const schedulesSnapshot = await adminDb.collection('classSchedules')
        .where('isActive', '==', true)
        .get();
      const totalClasses = schedulesSnapshot.size;

      // Get upcoming instances
      const today = new Date().toISOString().split('T')[0];
      const upcomingSnapshot = await adminDb.collection('classInstances')
        .where('date', '>=', today)
        .where('status', '==', 'scheduled')
        .get();
      const upcomingClasses = upcomingSnapshot.size;

      // Get completed instances
      const completedSnapshot = await adminDb.collection('classInstances')
        .where('status', '==', 'completed')
        .get();
      const completedClasses = completedSnapshot.size;

      // Calculate total participants and attendance
      let totalParticipants = 0;
      let totalCapacity = 0;
      const classTypeCounts: Record<string, number> = {};

      completedSnapshot.forEach(doc => {
        const data = doc.data();
        const participantCount = (data.registeredParticipants || []).length;
        totalParticipants += participantCount;
        totalCapacity += data.maxParticipants || 0;

        // Count class types
        const classType = data.classType;
        classTypeCounts[classType] = (classTypeCounts[classType] || 0) + 1;
      });

      const averageAttendance = totalCapacity > 0 ? (totalParticipants / totalCapacity) * 100 : 0;

      // Get popular class types with colors
      const popularClassTypes = Object.entries(classTypeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({
          type: type as any,
          count,
          color: getClassTypeColor(type as any),
        }));

      const stats = {
        totalClasses,
        upcomingClasses,
        completedClasses,
        totalParticipants,
        averageAttendance: Math.round(averageAttendance),
        popularClassTypes,
      };

      return successResponse(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      return errorResponse('Failed to load statistics');
    }
  })(request, { session: context.session });
}

// Helper function - should be imported from class types
function getClassTypeColor(classType: string): string {
  const colors: Record<string, string> = {
    'MMA': '#e53e3e',
    'BJJ': '#805ad5',
    'Boxing': '#d69e2e',
    'Muay Thai': '#e53e3e',
    'Wrestling': '#38a169',
    'Judo': '#3182ce',
    'Kickboxing': '#ed8936',
    'Fitness': '#4299e1',
    'Yoga': '#48bb78',
    'Kids Martial Arts': '#ed64a6'
  };
  return colors[classType] || '#718096';
}