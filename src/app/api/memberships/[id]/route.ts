// src/app/api/memberships/[id]/route.ts - Individual membership plan management with weekly limits
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';
import { MembershipPlan } from '@/app/types/membership';

// Validation schema for updating membership plans
const updateMembershipPlanSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  durationValue: z.number().min(1, 'Duration value must be at least 1').optional(),
  durationType: z.enum(['days', 'weeks', 'months', 'years', 'unlimited']).optional(),
  price: z.number().min(0, 'Price must be non-negative').optional(),
  currency: z.literal('USD').optional(),
  classTypes: z.array(z.string()).min(1, 'At least one class type must be selected').optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  
  // Weekly attendance limit fields
  weeklyAttendanceLimit: z.number().min(1).max(7).optional(),
  isUnlimited: z.boolean().optional(),
}).refine(
  (data) => {
    // If isUnlimited is explicitly set to false, weeklyAttendanceLimit must be provided
    if (data.isUnlimited === false && !data.weeklyAttendanceLimit) {
      return false;
    }
    return true;
  },
  {
    message: "weeklyAttendanceLimit is required when isUnlimited is false",
    path: ["weeklyAttendanceLimit"],
  }
);

// GET /api/memberships/[id] - Get single membership plan
export const GET = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams } = context;
    const params = await asyncParams;
    
    if (!params?.id) {
      return notFoundResponse('Membership plan');
    }

    const doc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!doc.exists) {
      return notFoundResponse('Membership plan');
    }

    const data = doc.data();
    const membershipPlan: MembershipPlan = {
      id: doc.id,
      name: data?.name || '',
      description: data?.description || '',
      durationValue: data?.durationValue || 1,
      durationType: data?.durationType || 'months',
      price: data?.price || 0,
      currency: data?.currency || 'USD',
      classTypes: data?.classTypes || [],
      status: data?.status || 'draft',
      weeklyAttendanceLimit: data?.weeklyAttendanceLimit || undefined,
      isUnlimited: data?.isUnlimited || false,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data?.createdBy || '',
      updatedBy: data?.updatedBy || '',
    };

    return successResponse(membershipPlan);

  } catch (error) {
    console.error('Error in GET /api/memberships/[id]:', error);
    return errorResponse('Failed to fetch membership plan', 500);
  }
});

// PUT /api/memberships/[id] - Update membership plan
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams, session } = context;
    const params = await asyncParams;
    
    if (!params?.id) {
      return notFoundResponse('Membership plan');
    }

    const body = await request.json();
    const validation = updateMembershipPlanSchema.safeParse(body);
    
    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const data = validation.data;

    // Check if membership plan exists
    const docRef = adminDb.collection('membershipPlans').doc(params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return notFoundResponse('Membership plan');
    }

    const existingData = doc.data();

    // Check for duplicate names if name is being updated
    if (data.name && data.name.trim() !== existingData?.name) {
      const existingPlan = await adminDb.collection('membershipPlans')
        .where('name', '==', data.name.trim())
        .get();

      if (!existingPlan.empty) {
        return errorResponse('A membership plan with this name already exists', 409);
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    // Only update provided fields
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();
    if (data.durationValue !== undefined) updateData.durationValue = data.durationValue;
    if (data.durationType !== undefined) updateData.durationType = data.durationType;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.classTypes !== undefined) updateData.classTypes = data.classTypes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isUnlimited !== undefined) {
      updateData.isUnlimited = data.isUnlimited;
      // If switching to unlimited, clear the weekly limit
      if (data.isUnlimited) {
        updateData.weeklyAttendanceLimit = null;
      }
    }
    if (data.weeklyAttendanceLimit !== undefined && !updateData.isUnlimited) {
      updateData.weeklyAttendanceLimit = data.weeklyAttendanceLimit;
    }

    await docRef.update(updateData);

    // Get updated document
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    const updatedPlan: MembershipPlan = {
      id: params.id,
      name: updatedData?.name || '',
      description: updatedData?.description || '',
      durationValue: updatedData?.durationValue || 1,
      durationType: updatedData?.durationType || 'months',
      price: updatedData?.price || 0,
      currency: updatedData?.currency || 'USD',
      classTypes: updatedData?.classTypes || [],
      status: updatedData?.status || 'draft',
      weeklyAttendanceLimit: updatedData?.weeklyAttendanceLimit || undefined,
      isUnlimited: updatedData?.isUnlimited || false,
      createdAt: updatedData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedData?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: updatedData?.createdBy || '',
      updatedBy: updatedData?.updatedBy || session.uid,
    };

    return successResponse(updatedPlan, 'Membership plan updated successfully');

  } catch (error) {
    console.error('Error in PUT /api/memberships/[id]:', error);
    return errorResponse('Failed to update membership plan', 500);
  }
});

// DELETE /api/memberships/[id] - Delete membership plan
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params: asyncParams } = context;
    const params = await asyncParams;
    
    if (!params?.id) {
      return notFoundResponse('Membership plan');
    }

    // Check if membership plan exists
    const docRef = adminDb.collection('membershipPlans').doc(params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return notFoundResponse('Membership plan');
    }

    // Check if any members are using this membership plan
    const activeMemberships = await adminDb.collection('memberMemberships')
      .where('membershipPlanId', '==', params.id)
      .where('status', 'in', ['active', 'frozen'])
      .get();

    if (!activeMemberships.empty) {
      return errorResponse(
        'Cannot delete membership plan that has active or frozen memberships. Please cancel or expire existing memberships first.',
        409
      );
    }

    await docRef.delete();

    return successResponse(null, 'Membership plan deleted successfully');

  } catch (error) {
    console.error('Error in DELETE /api/memberships/[id]:', error);
    return errorResponse('Failed to delete membership plan', 500);
  }
});