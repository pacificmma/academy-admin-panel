// src/app/api/memberships/route.ts - Session-based Authentication Fixed
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth/session';
import { adminDb } from '@/app/lib/firebase/admin';
import { z } from 'zod';

// Clean validation schema - esnek süre sistemi
const membershipPlanSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  durationValue: z.number().min(1), // 1, 2, 3, 6, 12 vb.
  durationType: z.enum(['days', 'weeks', 'months', 'years']), // esnek süre türü
  price: z.number().min(0),
  currency: z.string().length(3).default('USD'),
  classTypes: z.array(z.string()).min(1),
  status: z.enum(['active', 'inactive']).default('active'),
});

// GET /api/memberships
export async function GET(request: NextRequest) {
  try {
    // Session-based authentication
    const session = await getSession(request);
    if (!session || session.role !== 'admin' || !session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

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

    return NextResponse.json({
      success: true,
      data: plans,
      total: plans.length
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}

// POST /api/memberships
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin' || !session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = membershipPlanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const planData = validation.data;

    // Check duplicate name
    const existingPlan = await adminDb
      .collection('membershipPlans')
      .where('name', '==', planData.name)
      .get();

    if (!existingPlan.empty) {
      return NextResponse.json(
        { success: false, error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
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

    return NextResponse.json({
      success: true,
      data: createdPlan,
      message: 'Membership plan created successfully'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create membership plan' },
      { status: 500 }
    );
  }
}