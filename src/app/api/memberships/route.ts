// src/app/api/memberships/route.ts - Updated to support weekly attendance limits
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, createdResponse, errorResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { MembershipPlan } from '@/app/types/membership';

// Validation schema for creating/updating membership plans
const membershipPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  durationValue: z.number().min(1, 'Duration value must be at least 1'),
  durationType: z.enum(['days', 'weeks', 'months', 'years', 'unlimited']),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.literal('USD'),
  classTypes: z.array(z.string()).min(1, 'At least one class type must be selected'),
  status: z.enum(['active', 'inactive', 'draft']),
  
  // Weekly attendance limit fields
  weeklyAttendanceLimit: z.number().min(1).max(7).optional(),
  isUnlimited: z.boolean(),
}).refine(
  (data) => data.isUnlimited || data.weeklyAttendanceLimit,
  {
    message: "Either isUnlimited must be true or weeklyAttendanceLimit must be provided",
    path: ["weeklyAttendanceLimit"],
  }
);

// GET /api/memberships - List membership plans
export const GET = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = adminDb.collection('membershipPlans');

    // Apply filters
    if (status && ['active', 'inactive', 'draft'].includes(status)) {
      query = query.where('status', '==', status);
    }

    // Order by creation date
    query = query.orderBy('createdAt', 'desc');

    const querySnapshot = await query.get();
    const allPlans = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description || '',
        durationValue: data.durationValue,
        durationType: data.durationType,
        price: data.price,
        currency: data.currency || 'USD',
        classTypes: data.classTypes || [],
        status: data.status,
        weeklyAttendanceLimit: data.weeklyAttendanceLimit,
        isUnlimited: data.isUnlimited || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdBy: data.createdBy || '',
        updatedBy: data.updatedBy || '',
      } as MembershipPlan;
    });

    // Apply search filter
    let filteredPlans = allPlans;
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filteredPlans = allPlans.filter(plan =>
        plan.name.toLowerCase().includes(searchTerm) ||
        plan.description?.toLowerCase().includes(searchTerm) ||
        plan.classTypes.some(type => type.toLowerCase().includes(searchTerm))
      );
    }

    // Apply pagination
    const paginatedPlans = filteredPlans.slice(offset, offset + limit);

    // Calculate stats
    const stats = {
      totalPlans: filteredPlans.length,
      activePlans: filteredPlans.filter(p => p.status === 'active').length,
      inactivePlans: filteredPlans.filter(p => p.status === 'inactive').length,
    };

    return successResponse({
      data: paginatedPlans,
      pagination: {
        total: filteredPlans.length,
        limit,
        offset,
        hasMore: offset + limit < filteredPlans.length,
      },
      stats,
    });

  } catch (error) {
    console.error('Error in GET /api/memberships:', error);
    return errorResponse('Failed to fetch membership plans', 500);
  }
});

// POST /api/memberships - Create new membership plan
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();
    
    const validation = membershipPlanSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const data = validation.data;

    // Check for duplicate names
    const existingPlan = await adminDb.collection('membershipPlans')
      .where('name', '==', data.name.trim())
      .get();

    if (!existingPlan.empty) {
      return errorResponse('A membership plan with this name already exists', 409);
    }

    // Prepare membership plan data
    const membershipPlanData = {
      name: data.name.trim(),
      description: data.description?.trim() || '',
      durationValue: data.durationValue,
      durationType: data.durationType,
      price: data.price,
      currency: data.currency,
      classTypes: data.classTypes,
      status: data.status,
      weeklyAttendanceLimit: data.isUnlimited ? null : data.weeklyAttendanceLimit,
      isUnlimited: data.isUnlimited,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
      updatedBy: session.uid,
    };

    const docRef = await adminDb.collection('membershipPlans').add(membershipPlanData);

    // Get the created document to return with proper timestamps
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();

    const createdPlan: MembershipPlan = {
      id: docRef.id,
      name: createdData?.name || '',
      description: createdData?.description || '',
      durationValue: createdData?.durationValue || 1,
      durationType: createdData?.durationType || 'months',
      price: createdData?.price || 0,
      currency: createdData?.currency || 'USD',
      classTypes: createdData?.classTypes || [],
      status: createdData?.status || 'draft',
      weeklyAttendanceLimit: createdData?.weeklyAttendanceLimit || undefined,
      isUnlimited: createdData?.isUnlimited || false,
      createdAt: createdData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: createdData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: createdData?.createdBy || session.uid,
      updatedBy: createdData?.updatedBy || session.uid,
    };

    return createdResponse(createdPlan, 'Membership plan created successfully');

  } catch (error) {
    console.error('Error in POST /api/memberships:', error);
    return errorResponse('Failed to create membership plan', 500);
  }
});