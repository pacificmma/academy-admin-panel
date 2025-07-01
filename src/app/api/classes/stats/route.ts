// src/app/api/classes/stats/route.ts - Class Statistics

import { RequestContext, requireAdmin } from "@/app/lib/api/middleware";
import { errorResponse, successResponse } from "@/app/lib/api/response-utils";
import { adminDb } from "@/app/lib/firebase/admin";
import { getClassTypeColor } from "@/app/types/class";
import { NextRequest } from "next/server";

// FIXED: Changed function name and export style to fit Next.js API routes
export async function GET(request: NextRequest, context: RequestContext) {
    try {
      const { session } = context;
  
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
  };