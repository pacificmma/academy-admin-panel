// src/app/api/member-memberships/route.ts - Fixed Member membership management API
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { createdResponse, successResponse, errorResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { requireStaff, RequestContext } from '@/app/lib/api/middleware';
import { MemberMembership, MemberMembershipFilters, DurationType } from '@/app/types/membership';

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
export const GET = requireStaff(async (request: NextRequest) => {
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

    snapshot.forEach((doc: { data: () => any; id: any; }) => {
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

    return successResponse({
      data: memberMemberships,
      total: memberMemberships.length
    });

  } catch (err) {
    return errorResponse('Failed to fetch member memberships', 500, { details: err });
  }
});

// POST /api/member-memberships - Create new member membership
export const POST = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const body = await request.json();
    const validation = createMemberMembershipSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const user = context.session;
    
    // Verify that the member exists
    const memberDoc = await adminDb.collection('members').doc(validation.data.memberId).get();
    if (!memberDoc.exists) {
      return notFoundResponse('Member');
    }

    // Verify that the membership plan exists and is active
    const planDoc = await adminDb.collection('membershipPlans').doc(validation.data.membershipPlanId).get();
    if (!planDoc.exists) {
      return notFoundResponse('Membership plan');
    }

    const planData = planDoc.data();
    if (!planData || planData.status !== 'active') {
      return badRequestResponse('Membership plan is not active');
    }

    // Calculate end date based on plan duration - NOW ALIGNED WITH FRONTEND TYPES
    const startDate = new Date(validation.data.startDate);
    const endDate = new Date(startDate);
    
    const durationType = planData.durationType as DurationType;
    const durationValue = planData.durationValue as number;

    switch (durationType) {
      case 'weeks':
        endDate.setDate(endDate.getDate() + durationValue * 7);
        break;
      case 'months':
        endDate.setMonth(endDate.getMonth() + durationValue);
        break;
      case 'years':
        endDate.setFullYear(endDate.getFullYear() + durationValue);
        break;
      case 'days':
        endDate.setDate(endDate.getDate() + durationValue);
        break;
    }

    // Check if member already has an active membership
    const existingMemberships = await adminDb.collection('memberMemberships')
      .where('memberId', '==', validation.data.memberId)
      .where('status', 'in', ['active', 'pending'])
      .get();

    if (!existingMemberships.empty) {
      return errorResponse('Member already has an active membership', 409);
    }

    // Create membership data with proper typing
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

    return createdResponse(newMembership, 'Member membership created successfully');

  } catch (err) {
    return errorResponse('Failed to create member membership', 500, { details: err });
  }
});