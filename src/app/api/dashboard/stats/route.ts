// src/app/api/dashboard/stats/route.ts
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse } from '@/app/lib/api/response-utils';

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  totalStaff: number;
  activeStaff: number;
  totalClasses: number;
  upcomingClasses: number;
  completedClasses: number;
  totalMembershipPlans: number;
  activeMembershipPlans: number;
  totalDiscounts: number;
  activeDiscounts: number;
  totalParticipants: number;
  averageAttendance: number;
  lastUpdated: string;
  monthlyGrowth: {
    members: number;
    classes: number;
  };
}

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
export const GET = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { session } = context;

    // Get current date for filtering
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

    // Initialize stats object
    const stats: DashboardStats = {
      totalMembers: 0,
      activeMembers: 0,
      totalStaff: 0,
      activeStaff: 0,
      totalClasses: 0,
      upcomingClasses: 0,
      completedClasses: 0,
      totalMembershipPlans: 0,
      activeMembershipPlans: 0,
      totalDiscounts: 0,
      activeDiscounts: 0,
      totalParticipants: 0,
      averageAttendance: 0,
      lastUpdated: now.toISOString(),
      monthlyGrowth: {
        members: 0,
        classes: 0,
      },
    };

    try {
      // 1. Get member statistics
      const membersSnapshot = await adminDb.collection('members').get();
      stats.totalMembers = membersSnapshot.size;
      
      // Count active members (you can adjust this logic based on your membership status field)
      let activeMemberCount = 0;
      membersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isActive === true || data.status === 'active') {
          activeMemberCount++;
        }
      });
      stats.activeMembers = activeMemberCount;

      // Calculate monthly member growth
      const thisMonthMembersSnapshot = await adminDb
        .collection('members')
        .where('createdAt', '>=', new Date(thisMonth + '-01'))
        .get();
      
      const lastMonthMembersSnapshot = await adminDb
        .collection('members')
        .where('createdAt', '>=', new Date(lastMonth + '-01'))
        .where('createdAt', '<', new Date(thisMonth + '-01'))
        .get();

      const thisMonthCount = thisMonthMembersSnapshot.size;
      const lastMonthCount = lastMonthMembersSnapshot.size;
      stats.monthlyGrowth.members = lastMonthCount > 0 
        ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) 
        : thisMonthCount > 0 ? 100 : 0;

    } catch (error) {
      console.error('Error fetching member stats:', error);
    }

    try {
      // 2. Get staff statistics
      const staffSnapshot = await adminDb.collection('staff').get();
      stats.totalStaff = staffSnapshot.size;
      
      let activeStaffCount = 0;
      staffSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isActive === true) {
          activeStaffCount++;
        }
      });
      stats.activeStaff = activeStaffCount;

    } catch (error) {
      console.error('Error fetching staff stats:', error);
    }

    try {
      // 3. Get class statistics
      const classSchedulesSnapshot = await adminDb
        .collection('classSchedules')
        .where('isActive', '==', true)
        .get();
      stats.totalClasses = classSchedulesSnapshot.size;

      // Get class instances
      const upcomingInstancesSnapshot = await adminDb
        .collection('classInstances')
        .where('date', '>=', today)
        .where('status', '==', 'scheduled')
        .get();
      stats.upcomingClasses = upcomingInstancesSnapshot.size;

      const completedInstancesSnapshot = await adminDb
        .collection('classInstances')
        .where('status', '==', 'completed')
        .get();
      stats.completedClasses = completedInstancesSnapshot.size;

      // Calculate total participants and attendance
      let totalParticipants = 0;
      let totalCapacity = 0;

      completedInstancesSnapshot.forEach(doc => {
        const data = doc.data();
        const participantCount = (data.registeredParticipants || []).length;
        totalParticipants += participantCount;
        totalCapacity += data.maxParticipants || 0;
      });

      stats.totalParticipants = totalParticipants;
      stats.averageAttendance = totalCapacity > 0 
        ? Math.round((totalParticipants / totalCapacity) * 100) 
        : 0;

      // Calculate monthly class growth
      const thisMonthClassesSnapshot = await adminDb
        .collection('classInstances')
        .where('createdAt', '>=', new Date(thisMonth + '-01'))
        .get();
      
      const lastMonthClassesSnapshot = await adminDb
        .collection('classInstances')
        .where('createdAt', '>=', new Date(lastMonth + '-01'))
        .where('createdAt', '<', new Date(thisMonth + '-01'))
        .get();

      const thisMonthClassCount = thisMonthClassesSnapshot.size;
      const lastMonthClassCount = lastMonthClassesSnapshot.size;
      stats.monthlyGrowth.classes = lastMonthClassCount > 0 
        ? Math.round(((thisMonthClassCount - lastMonthClassCount) / lastMonthClassCount) * 100) 
        : thisMonthClassCount > 0 ? 100 : 0;

    } catch (error) {
      console.error('Error fetching class stats:', error);
    }

    try {
      // 4. Get membership plan statistics
      const membershipPlansSnapshot = await adminDb.collection('membershipPlans').get();
      stats.totalMembershipPlans = membershipPlansSnapshot.size;
      
      let activePlansCount = 0;
      membershipPlansSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'active') {
          activePlansCount++;
        }
      });
      stats.activeMembershipPlans = activePlansCount;

    } catch (error) {
      console.error('Error fetching membership plan stats:', error);
    }

    try {
      // 5. Get discount statistics
      const discountsSnapshot = await adminDb.collection('discounts').get();
      stats.totalDiscounts = discountsSnapshot.size;
      
      let activeDiscountsCount = 0;
      discountsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.isActive === true || data.status === 'active') {
          activeDiscountsCount++;
        }
      });
      stats.activeDiscounts = activeDiscountsCount;

    } catch (error) {
      console.error('Error fetching discount stats:', error);
    }

    return successResponse(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return errorResponse('Failed to load dashboard statistics', 500);
  }
});