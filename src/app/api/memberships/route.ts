//src/app/api/memberships/route.ts - FIXED VERSION
// ============================================

import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, createdResponse, conflictResponse } from '@/app/lib/api/response-utils';
import { z } from 'zod';

// Clean validation schema - esnek süre sistemi
const membershipPlanSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  durationValue: z.number().min(1), // 1, 2, 3, 6, 12 vb.
  durationType: z.enum(['days', 'weeks', 'months', 'years']), // esnek süre türü
  price: z.number().min(0),
  currency: z.literal('USD').default('USD'),
  classTypes: z.array(z.string()).min(1),
  status: z.enum(['active', 'inactive']).default('active'),
});

// GET /api/memberships - List membership plans
export const GET = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { session } = context;
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

    // Search filtering
    if (search) {
      const searchLower = search.toLowerCase();
      plans = plans.filter(plan => 
        plan.name.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower) ||
        plan.classTypes.some((type: string) => type.toLowerCase().includes(searchLower))
      );
    }

    return successResponse({
      data: plans,
      total: plans.length
    });

  } catch (error) {
    return errorResponse('Failed to fetch membership plans', 500);
  }
});

// POST /api/memberships - Create membership plan
export const POST = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { session } = context;
    const body = await request.json();
    const validation = membershipPlanSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { details: validation.error.issues });
    }

    const planData = validation.data;

    // Check duplicate name
    const existingPlan = await adminDb
      .collection('membershipPlans')
      .where('name', '==', planData.name)
      .get();

    if (!existingPlan.empty) {
      return conflictResponse('A membership plan with this name already exists');
    }

    const newPlan = {
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.uid,
    };

    const docRef = await adminDb.collection('membershipPlans').add(newPlan);
    
    const createdDoc = await docRef.get();
    const createdPlan = {
      id: createdDoc.id,
      ...createdDoc.data(),
      createdAt: createdDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: createdDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    return createdResponse(createdPlan, 'Membership plan created successfully');

  } catch (error) {
    return errorResponse('Failed to create membership plan', 500);
  }
});
