// src/app/api/memberships/[id]/route.ts - Individual membership plan operations
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { validateApiSession } from '@/app/lib/auth/session';
import { MembershipPlan } from '@/app/types/membership';
import { z } from 'zod';

// Validation schema for membership plan updates
const updateMembershipPlanSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  duration: z.enum(['1_week', '2_weeks', '3_weeks', '4_weeks', '1_month', '3_months', '6_months', '12_months', 'unlimited']).optional(),
  price: z.number().min(0.01).max(10000).optional(),
  classTypes: z.array(z.enum(['bjj', 'mma', 'boxing', 'muay_thai', 'wrestling', 'fitness', 'yoga', 'kickboxing'])).min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  currency: z.string().optional(),
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

// GET /api/memberships/[id] - Get specific membership plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAdminPermission(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const planDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const plan: MembershipPlan = {
      id: planDoc.id,
      ...planDoc.data(),
      createdAt: planDoc.data()?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: planDoc.data()?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    } as MembershipPlan;

    return NextResponse.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('Failed to fetch membership plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership plan' },
      { status: 500 }
    );
  }
}

// PUT /api/memberships/[id] - Update membership plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAdminPermission(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateMembershipPlanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Check if plan exists
    const planDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== planDoc.data()?.name) {
      const existingPlan = await adminDb
        .collection('membershipPlans')
        .where('name', '==', updateData.name)
        .get();

      if (!existingPlan.empty) {
        return NextResponse.json(
          { error: 'A membership plan with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the membership plan
    const updatedData = {
      ...updateData,
      updatedAt: new Date(),
      updatedBy: session.uid,
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

    return NextResponse.json({
      success: true,
      data: updatedPlan,
      message: 'Membership plan updated successfully'
    });

  } catch (error) {
    console.error('Failed to update membership plan:', error);
    return NextResponse.json(
      { error: 'Failed to update membership plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/memberships/[id] - Delete membership plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifyAdminPermission(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Check if plan exists
    const planDoc = await adminDb.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // Check if plan is currently used by any active memberships
    const activeMemberships = await adminDb
      .collection('memberMemberships')
      .where('membershipPlanId', '==', params.id)
      .where('status', 'in', ['active', 'pending'])
      .get();

    if (!activeMemberships.empty) {
      return NextResponse.json(
        { 
          error: 'Cannot delete membership plan that has active memberships',
          details: `This plan is currently used by ${activeMemberships.size} active memberships`
        },
        { status: 409 }
      );
    }

    // Soft delete - mark as inactive instead of actually deleting
    await adminDb.collection('membershipPlans').doc(params.id).update({
      status: 'inactive',
      deletedAt: new Date(),
      deletedBy: session.uid,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Membership plan deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete membership plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete membership plan' },
      { status: 500 }
    );
  }
}