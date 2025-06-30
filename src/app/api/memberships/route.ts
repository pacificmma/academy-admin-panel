// src/app/api/memberships/route.ts - Complete and Secure API Route
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { MembershipPlan, MembershipPlanFormData } from '@/app/types/membership';
import { z } from 'zod';
import { getSession } from '@/app/lib/auth/session';

// Validation schema
const membershipPlanSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  duration: z.enum(['1_week', '1_month', '3_months', '6_months', '1_year', '18_months', '2_years']),
  price: z.number().min(0.01).max(10000),
  currency: z.string().length(3).default('USD'),
  classTypes: z.array(z.enum(['mma', 'bjj', 'boxing', 'muay_thai', 'kickboxing', 'wrestling', 'judo', 'fitness', 'yoga', 'all_access'])).min(1),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  maxClasses: z.number().optional(),
  isUnlimited: z.boolean().default(false),
});

// Authentication helper
async function verifyAdminPermission(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const userDoc = await adminDb.collection('staff').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (!userData || userData.role !== 'admin' || !userData.isActive) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role,
      email: userData.email,
      fullName: userData.fullName,
    };
  } catch (error) {
    return null;
  }
}

// GET /api/memberships - Get all membership plans
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin' || !session.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Direkt Firestore'dan data çek
    const plansQuery = adminDb.collection('membershipPlans').orderBy('createdAt', 'desc')
    const plansSnapshot = await plansQuery.get();
    let plans: { id: string; }[] = [];

    plansSnapshot.forEach(doc => {
      plans.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return NextResponse.json({
      success: true,
      data: plans,
      total: plans.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch memberships', details: error.message },
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

    // Check if plan with same name already exists
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
    return NextResponse.json(
      { success: false, error: 'Failed to create membership plan' },
      { status: 500 }
    );
  }
}