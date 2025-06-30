// src/app/api/memberships/[id]/route.ts - Individual Operations
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/lib/auth/session';
import { adminDb } from '@/app/lib/firebase/admin';
import { z } from 'zod';

const updateMembershipPlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  durationValue: z.number().min(1).optional(),
  durationType: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  classTypes: z.array(z.string()).min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// GET /api/memberships/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin' || !session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const membershipDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const data = membershipDoc.data();
    const membership = {
      id: membershipDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: membership
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plan' },
      { status: 500 }
    );
  }
}

// PUT /api/memberships/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin' || !session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateMembershipPlanSchema.safeParse(body);

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

    const membershipDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const updateData = validation.data;

    // Check name uniqueness if being changed
    if (updateData.name) {
      const existingPlan = await adminDb
        .collection('membershipPlans')
        .where('name', '==', updateData.name)
        .get();

      if (!existingPlan.empty && existingPlan.docs[0].id !== params.id) {
        return NextResponse.json(
          { success: false, error: 'A membership plan with this name already exists' },
          { status: 409 }
        );
      }
    }

    await adminDb.collection('membershipPlans').doc(params.id).update({
      ...updateData,
      updatedAt: new Date(),
    });

    const updatedDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    const data = updatedDoc.data();
    const updatedMembership = {
      id: updatedDoc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: updatedMembership,
      message: 'Membership plan updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update membership plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/memberships/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin' || !session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const membershipDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    await adminDb.collection('membershipPlans').doc(params.id).delete();

    return NextResponse.json({
      success: true,
      message: 'Membership plan deleted successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete membership plan' },
      { status: 500 }
    );
  }
}