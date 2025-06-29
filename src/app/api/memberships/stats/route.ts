// src/app/api/memberships/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getSession } from '@/app/lib/auth/session';
import { MembershipPlan, MembershipStats } from '@/app/types/membership';
import { ApiResponse } from '@/app/types/api';

const db = getFirestore();

// GET /api/memberships/stats - Get membership statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all membership plans
    const plansQuery = query(collection(db, 'membershipPlans'));
    const plansSnapshot = await getDocs(plansQuery);
    
    const plans: MembershipPlan[] = plansSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as MembershipPlan;
    });

    // Calculate basic stats
    const totalPlans = plans.length;
    const activePlans = plans.filter(plan => plan.status === 'active').length;
    
    // Calculate total revenue (estimated based on active plans)
    const totalRevenue = plans
      .filter(plan => plan.status === 'active')
      .reduce((sum, plan) => sum + (plan.price || 0), 0);

    // Find popular plan
    const popularPlan = plans.find(plan => plan.isPopular)?.name || 'None';

    // TODO: Get actual member membership data for more accurate stats
    // This would require querying the memberMemberships collection
    // For now, we'll provide basic plan statistics

    const stats: MembershipStats = {
      totalPlans,
      activePlans,
      totalRevenue,
      monthlyRevenue: totalRevenue, // Placeholder - would need actual member data
      popularPlan,
      membershipDistribution: plans.map(plan => ({
        planId: plan.id,
        planName: plan.name,
        memberCount: 0, // Placeholder - would need to count actual members
        percentage: 0, // Placeholder
      })),
    };

    const response: ApiResponse<MembershipStats> = {
      success: true,
      data: stats,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch membership statistics' },
      { status: 500 }
    );
  }
}