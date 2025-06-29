// src/app/api/memberships/stats/route.ts - Membership statistics endpoint

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/firebase/admin';
import { db } from '@/app/lib/firebase/admin';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import { MembershipStats } from '@/app/types/membership';

// Utility function to verify admin permission
async function verifyAdminPermission(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('staff').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (!PERMISSIONS.memberships.read.includes(userData?.role)) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role,
      ...userData
    };
  } catch (error) {
    return null;
  }
}

// GET /api/memberships/stats - Get membership analytics and statistics
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminPermission(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all membership plans
    const plansSnapshot = await db.collection('membershipPlans').get();
    const totalPlans = plansSnapshot.size;
    const activePlans = plansSnapshot.docs.filter(doc => doc.data().isActive).length;

    // Get all member memberships
    const membershipsSnapshot = await db.collection('memberMemberships').get();
    const allMemberships = membershipsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter active memberships
    const activeMemberships = allMemberships.filter(membership => 
      membership.status === 'active'
    );

    const totalActiveMembers = activeMemberships.length;

    // Calculate revenue
    const totalRevenue = allMemberships.reduce((sum, membership) => 
      sum + (membership.amountPaid || 0), 0
    );

    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyMemberships = allMemberships.filter(membership => {
      const purchaseDate = new Date(membership.purchaseDate);
      return purchaseDate >= monthStart && purchaseDate <= monthEnd;
    });

    const monthlyRevenue = monthlyMemberships.reduce((sum, membership) => 
      sum + (membership.amountPaid || 0), 0
    );

    // Calculate average membership duration
    const completedMemberships = allMemberships.filter(membership => 
      membership.status === 'expired' || membership.status === 'cancelled'
    );

    let averageMembershipDuration = 0;
    if (completedMemberships.length > 0) {
      const totalDuration = completedMemberships.reduce((sum, membership) => {
        const start = new Date(membership.startDate);
        const end = new Date(membership.endDate);
        const durationDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + durationDays;
      }, 0);
      averageMembershipDuration = Math.round(totalDuration / completedMemberships.length);
    }

    // Plan-specific statistics
    const planStats: { [planId: string]: any } = {};
    
    for (const planDoc of plansSnapshot.docs) {
      const planData = planDoc.data();
      const planMemberships = allMemberships.filter(membership => 
        membership.membershipPlanId === planDoc.id
      );
      
      const planActiveMemberships = planMemberships.filter(membership => 
        membership.status === 'active'
      );
      
      const planRevenue = planMemberships.reduce((sum, membership) => 
        sum + (membership.amountPaid || 0), 0
      );

      const planCompletedMemberships = planMemberships.filter(membership => 
        membership.status === 'expired' || membership.status === 'cancelled'
      );

      let planAverageDuration = 0;
      if (planCompletedMemberships.length > 0) {
        const planTotalDuration = planCompletedMemberships.reduce((sum, membership) => {
          const start = new Date(membership.startDate);
          const end = new Date(membership.endDate);
          const durationDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + durationDays;
        }, 0);
        planAverageDuration = Math.round(planTotalDuration / planCompletedMemberships.length);
      }

      planStats[planDoc.id] = {
        name: planData.name,
        activeMembers: planActiveMemberships.length,
        totalRevenue: planRevenue,
        averageDuration: planAverageDuration,
      };
    }

    // Monthly breakdown for the last 12 months
    const monthlyBreakdown = [];
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      
      const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      
      const monthMemberships = allMemberships.filter(membership => {
        const purchaseDate = new Date(membership.purchaseDate);
        return purchaseDate >= monthStart && purchaseDate <= monthEnd;
      });

      const newMemberships = monthMemberships.filter(membership => 
        !membership.parentMembershipId // Exclude renewals by checking if it's not linked to a parent
      ).length;

      const renewals = monthMemberships.filter(membership => 
        membership.parentMembershipId // Renewals would have a parent membership
      ).length;

      const cancellations = allMemberships.filter(membership => {
        if (membership.status !== 'cancelled') return false;
        // Assume cancellationDate exists or use endDate
        const cancellationDate = new Date(membership.endDate);
        return cancellationDate >= monthStart && cancellationDate <= monthEnd;
      }).length;

      const monthRevenue = monthMemberships.reduce((sum, membership) => 
        sum + (membership.amountPaid || 0), 0
      );

      monthlyBreakdown.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        newMemberships,
        renewals,
        cancellations,
        revenue: monthRevenue,
      });
    }

    const stats: MembershipStats = {
      totalPlans,
      activePlans,
      totalActiveMembers,
      totalRevenue,
      monthlyRevenue,
      averageMembershipDuration,
      planStats,
      monthlyBreakdown,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch membership statistics', details: error },
      { status: 500 }
    );
  }
}

// src/app/api/member-memberships/route.ts - Individual member memberships API

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/lib/firebase/admin';
import { db } from '@/app/lib/firebase/admin';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import { 
  MemberMembership, 
  CreateMemberMembershipRequest,
  MemberMembershipFilters 
} from '@/app/types/membership';

// Validation schema for creating member memberships
const createMemberMembershipSchema = z.object({
  memberId: z.string().min(1),
  membershipPlanId: z.string().min(1),
  startDate: z.string(),
  amountPaid: z.number().min(0),
  currency: z.string().length(3),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'online', 'family_plan']),
  paymentReference: z.string().optional(),
  discountApplied: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
  autoRenewal: z.boolean(),
  isChildMembership: z.boolean(),
  parentMembershipId: z.string().optional(),
  adminNotes: z.string().max(1000).optional(),
  createdBy: z.string().min(1),
});

// Utility function to verify admin permission
async function verifyMembershipPermission(request: NextRequest, operation: 'read' | 'create' | 'update' | 'delete') {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('staff').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    // Check permissions based on operation
    let hasPermission = false;
    switch (operation) {
      case 'read':
        hasPermission = PERMISSIONS.members.read.includes(userData?.role) || 
                       PERMISSIONS.members.viewBasicInfo.includes(userData?.role);
        break;
      case 'create':
        hasPermission = PERMISSIONS.members.create.includes(userData?.role);
        break;
      case 'update':
        hasPermission = PERMISSIONS.members.update.includes(userData?.role);
        break;
      case 'delete':
        hasPermission = PERMISSIONS.members.delete.includes(userData?.role);
        break;
    }

    if (!hasPermission) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role,
      ...userData
    };
  } catch (error) {
    return null;
  }
}

// GET /api/member-memberships - List member memberships with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyMembershipPermission(request, 'read');
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const filters: MemberMembershipFilters = {
      memberId: url.searchParams.get('memberId') || undefined,
      membershipPlanId: url.searchParams.get('membershipPlanId') || undefined,
      status: url.searchParams.get('status') as any || undefined,
      startDateFrom: url.searchParams.get('startDateFrom') || undefined,
      startDateTo: url.searchParams.get('startDateTo') || undefined,
      endDateFrom: url.searchParams.get('endDateFrom') || undefined,
      endDateTo: url.searchParams.get('endDateTo') || undefined,
      isChildMembership: url.searchParams.get('isChildMembership') === 'true' ? true : 
                        url.searchParams.get('isChildMembership') === 'false' ? false : undefined,
      searchTerm: url.searchParams.get('search') || undefined,
    };

    let query = db.collection('memberMemberships').orderBy('createdAt', 'desc');

    // Apply filters
    if (filters.memberId) {
      query = query.where('memberId', '==', filters.memberId);
    }
    if (filters.membershipPlanId) {
      query = query.where('membershipPlanId', '==', filters.membershipPlanId);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.isChildMembership !== undefined) {
      query = query.where('isChildMembership', '==', filters.isChildMembership);
    }

    const snapshot = await query.get();
    let memberMemberships: MemberMembership[] = [];

    snapshot.forEach(doc => {
      memberMemberships.push({
        id: doc.id,
        ...doc.data()
      } as MemberMembership);
    });

    // Apply client-side filters for date ranges and search
    if (filters.startDateFrom) {
      memberMemberships = memberMemberships.filter(membership => 
        new Date(membership.startDate) >= new Date(filters.startDateFrom!)
      );
    }
    if (filters.startDateTo) {
      memberMemberships = memberMemberships.filter(membership => 
        new Date(membership.startDate) <= new Date(filters.startDateTo!)
      );
    }
    if (filters.endDateFrom) {
      memberMemberships = memberMemberships.filter(membership => 
        new Date(membership.endDate) >= new Date(filters.endDateFrom!)
      );
    }
    if (filters.endDateTo) {
      memberMemberships = memberMemberships.filter(membership => 
        new Date(membership.endDate) <= new Date(filters.endDateTo!)
      );
    }

    // For search, we would need to fetch member and plan details
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      // This is simplified - in a real app you might want to join with member data
      memberMemberships = memberMemberships.filter(membership => 
        membership.memberId.toLowerCase().includes(searchLower) ||
        membership.membershipPlanId.toLowerCase().includes(searchLower) ||
        membership.paymentReference?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: memberMemberships,
      total: memberMemberships.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch member memberships', details: error },
      { status: 500 }
    );
  }
}

// POST /api/member-memberships - Create new member membership
export async function POST(request: NextRequest) {
  try {
    const user = await verifyMembershipPermission(request, 'create');
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createMemberMembershipSchema.safeParse({
      ...body,
      createdBy: user.uid, // Ensure createdBy is set to current user
    });

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    // Verify that the member exists
    const memberDoc = await db.collection('members').doc(validation.data.memberId).get();
    if (!memberDoc.exists) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Verify that the membership plan exists and is active
    const planDoc = await db.collection('membershipPlans').doc(validation.data.membershipPlanId).get();
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const planData = planDoc.data();
    if (!planData?.isActive) {
      return NextResponse.json(
        { error: 'Membership plan is not active' },
        { status: 400 }
      );
    }

    // Calculate end date based on plan duration
    const startDate = new Date(validation.data.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planData.duration);

    // Check if member already has an active membership
    const existingMemberships = await db.collection('memberMemberships')
      .where('memberId', '==', validation.data.memberId)
      .where('status', '==', 'active')
      .get();

    if (!existingMemberships.empty) {
      return NextResponse.json(
        { error: 'Member already has an active membership' },
        { status: 409 }
      );
    }

    // Verify parent membership if this is a child membership
    if (validation.data.isChildMembership && validation.data.parentMembershipId) {
      const parentMembershipDoc = await db.collection('memberMemberships')
        .doc(validation.data.parentMembershipId).get();
      
      if (!parentMembershipDoc.exists) {
        return NextResponse.json(
          { error: 'Parent membership not found' },
          { status: 404 }
        );
      }

      const parentMembership = parentMembershipDoc.data();
      if (parentMembership?.status !== 'active') {
        return NextResponse.json(
          { error: 'Parent membership is not active' },
          { status: 400 }
        );
      }
    }

    const membershipData: Omit<MemberMembership, 'id'> = {
      ...validation.data,
      endDate: endDate.toISOString(),
      purchaseDate: new Date().toISOString(),
      status: 'active',
      classesAttended: 0,
      personalTrainingUsed: 0,
      guestPassesUsed: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create the member membership
    const docRef = await db.collection('memberMemberships').add(membershipData);
    
    const newMembership: MemberMembership = {
      id: docRef.id,
      ...membershipData
    };

    return NextResponse.json({
      success: true,
      data: newMembership,
      message: 'Member membership created successfully'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create member membership', details: error },
      { status: 500 }
    );
  }
}

// src/app/api/member-memberships/[id]/route.ts - Individual member membership operations

// GET /api/member-memberships/[id] - Get specific member membership
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyMembershipPermission(request, 'read');
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
    
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { error: 'Member membership not found' },
        { status: 404 }
      );
    }

    const membership: MemberMembership = {
      id: membershipDoc.id,
      ...membershipDoc.data()
    } as MemberMembership;

    return NextResponse.json({
      success: true,
      data: membership
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch member membership', details: error },
      { status: 500 }
    );
  }
}

// PUT /api/member-memberships/[id] - Update member membership
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyMembershipPermission(request, 'update');
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Check if membership exists
    const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { error: 'Member membership not found' },
        { status: 404 }
      );
    }

    const updateData = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    await db.collection('memberMemberships').doc(params.id).update(updateData);

    // Get updated document
    const updatedDoc = await db.collection('memberMemberships').doc(params.id).get();
    const updatedMembership: MemberMembership = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as MemberMembership;

    return NextResponse.json({
      success: true,
      data: updatedMembership,
      message: 'Member membership updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update member membership', details: error },
      { status: 500 }
    );
  }
}

// src/app/api/member-memberships/[id]/cancel/route.ts - Cancel membership endpoint
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyMembershipPermission(request, 'update');
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      );
    }

    // Check if membership exists and is active
    const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { error: 'Member membership not found' },
        { status: 404 }
      );
    }

    const membershipData = membershipDoc.data();
    if (membershipData?.status !== 'active') {
      return NextResponse.json(
        { error: 'Only active memberships can be cancelled' },
        { status: 400 }
      );
    }

    await db.collection('memberMemberships').doc(params.id).update({
      status: 'cancelled',
      cancellationReason: reason,
      cancelledBy: user.uid,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Membership cancelled successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cancel membership', details: error },
      { status: 500 }
    );
  }
}