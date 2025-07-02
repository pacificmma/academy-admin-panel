//src/app/api/member-memberships/route.ts - FIXED VERSION
// ============================================

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { createdResponse, successResponse, errorResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { requireStaff } from '@/app/lib/api/middleware';
import { MemberMembership, MemberMembershipFilters } from '@/app/types/membership';

// Validation schema for creating member memberships
const createMemberMembershipSchema = z.object({
  memberId: z.string().min(1),
  membershipPlanId: z.string().min(1),
  startDate: z.string(),
  amount: z.number().min(0),
  currency: z.string().length(3),
  paymentReference: z.string().optional(),
});

// GET /api/member-memberships - List member memberships with filtering
export const GET = requireStaff(async (request: NextRequest, context) => {
  try {
    const url = new URL(request.url);
    
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

    let query: any = adminDb.collection('memberMemberships').orderBy('createdAt', 'desc');

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

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      memberMemberships.push({
        id: doc.id,
        ...data,
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

    return successResponse({
      data: memberMemberships,
      total: memberMemberships.length
    });

  } catch (err) {
    return errorResponse('Failed to fetch member memberships', 500);
  }
});

// POST /api/member-memberships - Create new member membership
export const POST = requireStaff(async (request: NextRequest, context) => {
  try {
    const { session } = context;
    const body = await request.json();
    const validation = createMemberMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    // Verify that the member exists
    const memberDoc = await adminDb.collection('members').doc(validation.data.memberId).get();
    if (!memberDoc.exists) {
      return notFoundResponse('Member');
    }

    // Verify that the membership plan exists
    const planDoc = await adminDb.collection('membershipPlans').doc(validation.data.membershipPlanId).get();
    if (!planDoc.exists) {
      return notFoundResponse('Membership plan');
    }

    const planData = planDoc.data();
    const startDate = new Date(validation.data.startDate);
    const endDate = new Date(startDate);
    
    // Calculate end date based on plan duration
    switch (planData?.durationType) {
      case 'months':
        endDate.setMonth(endDate.getMonth() + planData.duration);
        break;
      case 'days':
        endDate.setDate(endDate.getDate() + planData.duration);
        break;
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + planData.duration);
        break;
    }

    // Create the membership
    const membershipData = {
      ...validation.data,
      endDate: endDate.toISOString(),
      status: 'active' as const,
      paymentStatus: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.uid,
    };

    const docRef = await adminDb.collection('memberMemberships').add(membershipData);

    // Get the created membership
    const createdDoc = await docRef.get();
    const createdMembership: MemberMembership = {
      id: createdDoc.id,
      ...createdDoc.data(),
      createdAt: createdDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: createdDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as MemberMembership;

    return createdResponse(createdMembership, 'Member membership created successfully');
    
  } catch (err) {
    return errorResponse('Failed to create member membership', 500);
  }
});