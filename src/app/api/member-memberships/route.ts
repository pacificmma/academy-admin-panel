// src/app/api/member-memberships/route.ts - Fixed Member membership management API

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
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
  amount: z.number().min(0),
  currency: z.string().length(3),
  paymentReference: z.string().optional(),
});

// Interface for authenticated user
interface AuthenticatedUser {
  uid: string;
  role: string;
  email: string;
  fullName: string;
  isActive: boolean;
}

// Utility function to verify admin permission
async function verifyMembershipPermission(request: NextRequest, operation: 'read' | 'create' | 'update' | 'delete'): Promise<AuthenticatedUser | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('staff').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    // FIXED: Check if userData exists before accessing properties
    if (!userData) {
      return null;
    }
    
    // Check permissions based on operation
    let hasPermission = false;
    switch (operation) {
      case 'read':
        hasPermission = PERMISSIONS.members.read.includes(userData.role) || 
                       PERMISSIONS.members.viewBasicInfo.includes(userData.role);
        break;
      case 'create':
        hasPermission = PERMISSIONS.members.create.includes(userData.role);
        break;
      case 'update':
        hasPermission = PERMISSIONS.members.update.includes(userData.role);
        break;
      case 'delete':
        hasPermission = PERMISSIONS.members.delete.includes(userData.role);
        break;
    }

    if (!hasPermission) {
      return null;
    }

    // FIXED: Properly type the return object and ensure userData exists
    return {
      uid: decodedToken.uid,
      role: userData.role,
      email: userData.email,
      fullName: userData.fullName,
      isActive: userData.isActive
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
    
    // FIXED: Only include properties that exist in MemberMembershipFilters type
    const filters: MemberMembershipFilters = {
      memberId: url.searchParams.get('memberId') || undefined,
      membershipPlanId: url.searchParams.get('membershipPlanId') || undefined,
      status: (url.searchParams.get('status') as MemberMembership['status']) || undefined,
      paymentStatus: (url.searchParams.get('paymentStatus') as MemberMembership['paymentStatus']) || undefined,
      startDateFrom: url.searchParams.get('startDateFrom') || undefined,
      startDateTo: url.searchParams.get('startDateTo') || undefined,
      endDateFrom: url.searchParams.get('endDateFrom') || undefined,
      endDateTo: url.searchParams.get('endDateTo') || undefined,
      searchTerm: url.searchParams.get('search') || undefined,
    };

    let query = adminDb.collection('memberMemberships').orderBy('createdAt', 'desc');

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
    if (filters.paymentStatus) {
      query = query.where('paymentStatus', '==', filters.paymentStatus);
    }

    const snapshot = await query.get();
    let memberMemberships: MemberMembership[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      memberMemberships.push({
        id: doc.id,
        ...data,
        // Ensure dates are properly formatted
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as MemberMembership);
    });

    // Apply client-side filters for date ranges
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

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
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
    const validation = createMemberMembershipSchema.safeParse(body);

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
    const memberDoc = await adminDb.collection('members').doc(validation.data.memberId).get();
    if (!memberDoc.exists) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Verify that the membership plan exists and is active
    const planDoc = await adminDb.collection('membershipPlans').doc(validation.data.membershipPlanId).get();
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const planData = planDoc.data();
    if (!planData || planData.status !== 'active') {
      return NextResponse.json(
        { error: 'Membership plan is not active' },
        { status: 400 }
      );
    }

    // Calculate end date based on plan duration
    const startDate = new Date(validation.data.startDate);
    const endDate = new Date(startDate);
    
    // Add duration based on plan duration type
    switch (planData.duration) {
      case '1_week':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case '1_month':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case '3_months':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case '6_months':
        endDate.setMonth(endDate.getMonth() + 6);
        break;
      case '1_year':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case '18_months':
        endDate.setMonth(endDate.getMonth() + 18);
        break;
      case '2_years':
        endDate.setFullYear(endDate.getFullYear() + 2);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }

    // Check if member already has an active membership
    const existingMemberships = await adminDb.collection('memberMemberships')
      .where('memberId', '==', validation.data.memberId)
      .where('status', '==', 'active')
      .get();

    if (!existingMemberships.empty) {
      return NextResponse.json(
        { error: 'Member already has an active membership' },
        { status: 409 }
      );
    }

    // FIXED: Create membership data with proper typing and only existing properties
    const membershipData: Omit<MemberMembership, 'id'> = {
      memberId: validation.data.memberId,
      membershipPlanId: validation.data.membershipPlanId,
      startDate: validation.data.startDate,
      endDate: endDate.toISOString(),
      status: 'active',
      paymentReference: validation.data.paymentReference,
      paymentStatus: 'paid',
      amount: validation.data.amount,
      currency: validation.data.currency,
      classesUsed: 0,
      maxClasses: planData.maxClasses,
      isUnlimited: planData.isUnlimited || false,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create the member membership
    const docRef = await adminDb.collection('memberMemberships').add(membershipData);
    
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