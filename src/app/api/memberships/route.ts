// src/app/api/memberships/route.ts - Secure and Unified API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { MembershipPlan } from '@/app/types/membership';
import { z } from 'zod';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { createdResponse, successResponse, errorResponse } from '@/app/lib/api/response-utils';
import { MembershipPlanFormData } from '@/app/types/membership';

// Validation schema - NOW ALIGNED WITH FRONTEND
const membershipPlanSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  durationValue: z.number().int().positive(),
  durationType: z.enum(['days', 'weeks', 'months', 'years']),
  price: z.number().min(0.01).max(10000),
  currency: z.string().length(3).default('USD'),
  classTypes: z.array(z.enum(['mma', 'bjj', 'boxing', 'muay_thai', 'kickboxing', 'wrestling', 'judo', 'fitness', 'yoga', 'all_access'])).min(1),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  maxClasses: z.number().optional(),
  isUnlimited: z.boolean().default(false),
});

// GET /api/memberships - Get all membership plans
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    let query = adminDb.collection('membershipPlans').orderBy('createdAt', 'desc');
    const snapshot = await query.get();

    let plans: any[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      plans.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });

    // Apply search filtering (client-side for full text)
    if (search) {
      const searchLower = search.toLowerCase();
      plans = plans.filter(plan =>
        plan.name.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower) ||
        plan.classTypes.some((type: string) => type.toLowerCase().includes(searchLower))
      );
    }

    // FIXED: Return the array directly under the 'data' key, not nested.
    return successResponse(plans, `Successfully fetched ${plans.length} membership plans.`);
  } catch (err: any) {
    console.error('Failed to fetch memberships:', err);
    return errorResponse('Failed to fetch memberships', 500);
  }
});

// POST /api/memberships - Create new membership plan
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const body = await request.json();
    const validation = membershipPlanSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    const planData = validation.data;

    // Check if plan with same name already exists
    const existingPlan = await adminDb
      .collection('membershipPlans')
      .where('name', '==', planData.name)
      .get();

    if (!existingPlan.empty) {
      return errorResponse('A membership plan with this name already exists', 409);
    }

    // Create the membership plan
    const newPlan = {
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: context.session.uid,
    };

    const docRef = await adminDb.collection('membershipPlans').add(newPlan);

    // Get the created plan
    const createdDoc = await docRef.get();
    const createdPlan: MembershipPlan = {
      id: createdDoc.id,
      ...createdDoc.data(),
      createdAt: createdDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: createdDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as MembershipPlan;

    return createdResponse(createdPlan, 'Membership plan created successfully');
  } catch (err) {
    console.error('Failed to create membership plan:', err);
    return errorResponse('Failed to create membership plan', 500);
  }
});