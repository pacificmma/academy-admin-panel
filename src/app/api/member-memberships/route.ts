// src/app/api/member-memberships/route.ts - FIXED
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { createdResponse, successResponse, errorResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { requireStaff, RequestContext } from '@/app/lib/api/middleware';
import { MemberMembership, MemberMembershipFilters } from '@/app/types/membership';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for creating member memberships
const createMemberMembershipSchema = z.object({
  memberId: z.string().min(1),
  membershipPlanId: z.string().min(1),
  startDate: z.string(),
  paymentReference: z.string().optional(),
});

// GET /api/member-memberships - List member memberships with filtering
export const GET = requireStaff(async (request: NextRequest, context: RequestContext) => {
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

    // Start with base collection reference - NO orderBy initially
    let query: any = adminDb.collection('memberMemberships');

    // Apply filters one by one
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

    // Execute query without orderBy to avoid composite index requirement
    const snapshot = await query.get();
    let memberMemberships: MemberMembership[] = [];

    // Prepare batch requests for plan and member data
    const planIds = new Set<string>();
    const memberIds = new Set<string>();
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.membershipPlanId) planIds.add(data.membershipPlanId);
      if (data.memberId) memberIds.add(data.memberId);
    });

    // Fetch plan data in parallel
    const planDataMap = new Map<string, any>();
    if (planIds.size > 0) {
      console.log('Fetching plan data for IDs:', Array.from(planIds));
      const planPromises = Array.from(planIds).map(async (planId) => {
        try {
          const planDoc = await adminDb.collection('membershipPlans').doc(planId).get();
          if (planDoc.exists) {
            const planData = planDoc.data();
            console.log(`Plan ${planId} found:`, { name: planData?.name, classTypes: planData?.classTypes });
            planDataMap.set(planId, planData);
          } else {
            console.log(`Plan ${planId} NOT FOUND`);
          }
        } catch (error) {
          console.error(`Error fetching plan ${planId}:`, error);
        }
      });
      await Promise.all(planPromises);
    }

    // Fetch member data in parallel
    const memberDataMap = new Map<string, any>();
    if (memberIds.size > 0) {
      const memberPromises = Array.from(memberIds).map(async (memberId) => {
        try {
          const memberDoc = await adminDb.collection('members').doc(memberId).get();
          if (memberDoc.exists) {
            const memberData = memberDoc.data();
            memberDataMap.set(memberId, {
              name: memberData?.name || 'Unknown Member',
              email: memberData?.email || ''
            });
          }
        } catch (error) {
          console.error(`Error fetching member ${memberId}:`, error);
        }
      });
      await Promise.all(memberPromises);
    }

    // Build the response with joined data
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const planData = planDataMap.get(data.membershipPlanId);
      const memberData = memberDataMap.get(data.memberId);

      memberMemberships.push({
        id: doc.id,
        ...data,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        // Join plan data
        planName: planData?.name || `Plan ID: ${data.membershipPlanId}`,
        planClassTypes: planData?.classTypes || [],
        // Join member data
        memberName: memberData?.name || 'Unknown Member',
        memberEmail: memberData?.email || '',
      } as MemberMembership);
      
      // Debug log
      console.log(`Membership ${doc.id} - Plan: ${planData?.name || 'NOT FOUND'}, Member: ${memberData?.name || 'NOT FOUND'}`);
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

    // Sort by createdAt in JavaScript (descending - newest first)
    memberMemberships.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order
    });

    return successResponse({
      data: memberMemberships,
      total: memberMemberships.length
    });

  } catch (err) {
    console.error('Error in GET /api/member-memberships:', err);
    return errorResponse('Failed to fetch member memberships', 500);
  }
});

// POST /api/member-memberships - Create new member membership
export const POST = requireStaff(async (request: NextRequest, context: RequestContext) => {
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
    
    // Get amount and currency from plan
    if (!planData?.price || !planData?.currency) {
      return errorResponse('Invalid membership plan: missing price information', 400);
    }
    
    // Validate and parse start date
    const startDate = new Date(validation.data.startDate);
    if (isNaN(startDate.getTime())) {
      return errorResponse('Invalid start date format', 400);
    }

    // Validate plan duration data - use durationValue instead of duration
    if (!planData?.durationType || typeof planData?.durationValue !== 'number') {
      console.error('Plan data missing duration info:', { 
        durationType: planData?.durationType, 
        durationValue: planData?.durationValue,
        planId: validation.data.membershipPlanId 
      });
      return errorResponse('Invalid membership plan: missing duration information', 400);
    }

    // Calculate end date safely based on plan duration
    let endDate: Date;
    try {
      switch (planData.durationType) {
        case 'months':
          // Use a safer method for adding months
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + planData.durationValue, startDate.getDate());
          // Handle cases where the day doesn't exist in the target month (e.g., Jan 31 + 1 month)
          if (endDate.getDate() !== startDate.getDate()) {
            // Set to last day of the target month
            endDate = new Date(startDate.getFullYear(), startDate.getMonth() + planData.durationValue + 1, 0);
          }
          break;
        case 'days':
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + planData.durationValue);
          break;
        case 'weeks':
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + (planData.durationValue * 7));
          break;
        case 'years':
          endDate = new Date(startDate.getFullYear() + planData.durationValue, startDate.getMonth(), startDate.getDate());
          // Handle leap year edge case
          if (endDate.getDate() !== startDate.getDate()) {
            endDate = new Date(startDate.getFullYear() + planData.durationValue, startDate.getMonth() + 1, 0);
          }
          break;
        default:
          return errorResponse('Invalid duration type in membership plan', 400);
      }

      // Validate the calculated end date
      if (isNaN(endDate.getTime())) {
        throw new Error('Calculated end date is invalid');
      }
    } catch (dateError) {
      console.error('Date calculation error:', dateError);
      return errorResponse('Failed to calculate membership end date', 400);
    }

    // Create the membership
    const membershipData = {
      ...validation.data,
      amount: planData.price, // Get from plan
      currency: planData.currency, // Get from plan  
      endDate: endDate.toISOString(),
      status: 'active' as const,
      paymentStatus: 'pending' as const,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
    };

    const docRef = await adminDb.collection('memberMemberships').add(membershipData);

    // Get the created membership and construct response
    const createdMembership: MemberMembership = {
      id: docRef.id,
      memberId: validation.data.memberId,
      membershipPlanId: validation.data.membershipPlanId,
      startDate: validation.data.startDate,
      endDate: endDate.toISOString(),
      amount: planData.price, // From plan
      currency: planData.currency, // From plan
      paymentReference: validation.data.paymentReference,
      status: 'active' as const,
      paymentStatus: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.uid,
    };

    return createdResponse(createdMembership, 'Member membership created successfully');
    
  } catch (err) {
    console.error('Error in POST /api/member-memberships:', err);
    return errorResponse('Failed to create member membership', 500);
  }
});