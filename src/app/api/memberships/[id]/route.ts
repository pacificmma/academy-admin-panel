// src/app/api/memberships/[id]/route.ts - Secure and consistent individual membership plan operations
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { MembershipPlan, DurationType } from '@/app/types/membership';
import { z } from 'zod';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';

// Validation schema for membership plan updates - NOW ALIGNED WITH FRONTEND
const updateMembershipPlanSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  durationValue: z.number().int().positive().optional(),
  durationType: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  price: z.number().min(0.01).max(10000).optional(),
  classTypes: z.array(z.enum(['mma', 'bjj', 'boxing', 'muay_thai', 'kickboxing', 'wrestling', 'judo', 'fitness', 'yoga', 'all_access'])).min(1).optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  currency: z.string().optional(),
});

// GET /api/memberships/[id] - Get specific membership plan
export const GET = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Membership plan');
  }
  try {
    const planDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return notFoundResponse('Membership plan');
    }

    const plan: MembershipPlan = {
      id: planDoc.id,
      ...planDoc.data(),
      createdAt: planDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: planDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as MembershipPlan;

    return successResponse(plan);
  } catch (err) {
    console.error('Failed to fetch membership plan:', err);
    return errorResponse('Failed to fetch membership plan', 500);
  }
});

// PUT /api/memberships/[id] - Update membership plan
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Membership plan');
  }
  try {
    const body = await request.json();
    const validation = updateMembershipPlanSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const updateData = validation.data;

    // Check if plan exists
    const planDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return notFoundResponse('Membership plan');
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== planDoc.data()?.name) {
      const existingPlan = await adminDb
        .collection('membershipPlans')
        .where('name', '==', updateData.name)
        .get();

      if (!existingPlan.empty && existingPlan.docs[0].id !== params.id) {
        return errorResponse('A membership plan with this name already exists', 409);
      }
    }

    // Update the membership plan
    const updatedData = {
      ...updateData,
      updatedAt: adminDb.firestore.FieldValue.serverTimestamp(), // FIXED: Use consistent server timestamp
      updatedBy: context.session.uid,
    };

    await adminDb.collection('membershipPlans').doc(params.id).update(updatedData);
    
    // Get the updated plan
    const updatedDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    const updatedPlan: MembershipPlan = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as MembershipPlan;

    return successResponse(updatedPlan, 'Membership plan updated successfully');
  } catch (err) {
    console.error('Failed to update membership plan:', err);
    return errorResponse('Failed to update membership plan', 500);
  }
});

// DELETE /api/memberships/[id] - Hard delete membership plan
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  const { params } = context;
  if (!params?.id) {
    return notFoundResponse('Membership plan');
  }
  try {
    // Check if plan exists
    const planDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return notFoundResponse('Membership plan');
    }

    // Check if plan is currently used by any active memberships
    const activeMemberships = await adminDb
      .collection('memberMemberships')
      .where('membershipPlanId', '==', params.id)
      .where('status', 'in', ['active', 'pending'])
      .get();

    if (!activeMemberships.empty) {
      return errorResponse(
        'Cannot delete membership plan that has active memberships',
        409,
        { details: `This plan is currently used by ${activeMemberships.size} active memberships` }
      );
    }

    // PERMANENTLY DELETE THE DOCUMENT
    await adminDb.collection('membershipPlans').doc(params.id).delete();

    return successResponse(null, 'Membership plan deleted successfully');
  } catch (err) {
    console.error('Failed to delete membership plan:', err);
    return errorResponse('Failed to delete membership plan', 500);
  }
});