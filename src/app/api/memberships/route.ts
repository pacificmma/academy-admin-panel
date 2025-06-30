// src/app/api/memberships/route.ts - Main memberships API endpoint
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { validateApiSession } from '@/app/lib/auth/session';
import { MembershipPlan, MembershipPlanFormData } from '@/app/types/membership';
import { z } from 'zod';

// Validation schema for membership plan creation/update
const membershipPlanSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  duration: z.enum(['1_week', '2_weeks', '3_weeks', '4_weeks', '1_month', '3_months', '6_months', '12_months', 'unlimited']),
  price: z.number().min(0.01).max(10000),
  classTypes: z.array(z.enum(['bjj', 'mma', 'boxing', 'muay_thai', 'wrestling', 'fitness', 'yoga', 'kickboxing'])).min(1),
  status: z.enum(['active', 'inactive']).default('active'),
  currency: z.string().default('USD'),
});

// Verify admin permissions
async function verifyAdminPermission(request: NextRequest) {
  try {
    const session = await validateApiSession(request);
    
    if (!session || session.role !== 'admin') {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

// GET /api/memberships - Get all membership plans
export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminPermission(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    // Get membership plans from Firestore
    let plansQuery = adminDb.collection('membershipPlans').orderBy('createdAt', 'desc');
    
    const plansSnapshot = await plansQuery.get();
    let plans: MembershipPlan[] = [];

    plansSnapshot.forEach(doc => {
      plans.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as MembershipPlan);
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      plans = plans.filter(plan => 
        plan.name.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower) ||
        plan.classTypes.some(type => type.toLowerCase().includes(searchLower))
      );
    }

    return NextResponse.json({
      success: true,
      data: plans,
      total: plans.length
    });

  } catch (error) {
    console.error('Failed to fetch membership plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}

// POST /api/memberships - Create new membership plan
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminPermission(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = membershipPlanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const planData = validation.data;

    // Check if plan with same name already exists
    const existingPlan = await adminDb
      .collection('membershipPlans')
      .where('name', '==', planData.name)
      .get();

    if (!existingPlan.empty) {
      return NextResponse.json(
        { error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    // Create the membership plan
    const newPlan = {
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.uid,
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

    return NextResponse.json({
      success: true,
      data: createdPlan,
      message: 'Membership plan created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create membership plan:', error);
    return NextResponse.json(
      { error: 'Failed to create membership plan' },
      { status: 500 }
    );
  }
}