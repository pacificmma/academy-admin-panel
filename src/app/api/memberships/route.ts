// src/app/api/memberships/route.ts - Main membership plans API endpoint

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/lib/firebase/admin';
import { db } from '@/app/lib/firebase/admin';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import { 
  MembershipPlan, 
  CreateMembershipPlanRequest, 
  MembershipPlanFilters,
  MEMBERSHIP_VALIDATION 
} from '@/app/types/membership';

// Validation schema for creating membership plans
const createMembershipSchema = z.object({
  name: z.string()
    .min(MEMBERSHIP_VALIDATION.name.minLength)
    .max(MEMBERSHIP_VALIDATION.name.maxLength),
  description: z.string()
    .max(MEMBERSHIP_VALIDATION.description.maxLength)
    .optional(),
  type: z.enum(['full_access', 'bjj_only', 'mma_only', 'boxing_only', 'muay_thai_only', 'kickboxing_only', 'wrestling_only', 'judo_only', 'karate_only', 'custom']),
  duration: z.enum([1, 3, 6, 12]),
  price: z.number()
    .min(MEMBERSHIP_VALIDATION.price.min)
    .max(MEMBERSHIP_VALIDATION.price.max),
  currency: z.string().length(3),
  includedClasses: z.array(z.string()).min(1),
  classLimitPerMonth: z.number().min(1).optional(),
  personalTrainingIncluded: z.number().min(0).optional(),
  guestPassesIncluded: z.number().min(0).optional(),
  ageRestrictions: z.object({
    minAge: z.number().min(0).max(100).optional(),
    maxAge: z.number().min(0).max(100).optional(),
  }).optional(),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  sortOrder: z.number()
    .min(MEMBERSHIP_VALIDATION.sortOrder.min)
    .max(MEMBERSHIP_VALIDATION.sortOrder.max),
  maxActiveMembers: z.number().min(1).optional(),
  requiresPhysicalExam: z.boolean().optional(),
  requiresParentalConsent: z.boolean().optional(),
  autoRenewal: z.boolean(),
  gracePeriodDays: z.number()
    .min(MEMBERSHIP_VALIDATION.gracePeriodDays.min)
    .max(MEMBERSHIP_VALIDATION.gracePeriodDays.max),
  notes: z.string().max(1000).optional(),
});

// Utility functions
async function verifyAdminPermission(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decodedToken = await auth.verifyIdToken(token);
    const userDoc = await db.collection('staff').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (!PERMISSIONS.memberships.read.includes(userData?.role)) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role,
      ...userData
    };
  } catch (error) {
    return null;
  }
}

// GET /api/memberships - List membership plans with filtering
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdminPermission(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const filters: MembershipPlanFilters = {
      type: url.searchParams.get('type') as any,
      isActive: url.searchParams.get('isActive') === 'true' ? true : 
                url.searchParams.get('isActive') === 'false' ? false : undefined,
      isPublic: url.searchParams.get('isPublic') === 'true' ? true :
                url.searchParams.get('isPublic') === 'false' ? false : undefined,
      minPrice: url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined,
      maxPrice: url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined,
      duration: url.searchParams.get('duration') ? Number(url.searchParams.get('duration')) as any : undefined,
      searchTerm: url.searchParams.get('search') || undefined,
    };

    let query = db.collection('membershipPlans').orderBy('sortOrder', 'asc');

    // Apply filters
    if (filters.type) {
      query = query.where('type', '==', filters.type);
    }
    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }
    if (filters.isPublic !== undefined) {
      query = query.where('isPublic', '==', filters.isPublic);
    }
    if (filters.duration) {
      query = query.where('duration', '==', filters.duration);
    }

    const snapshot = await query.get();
    let plans: MembershipPlan[] = [];

    snapshot.forEach(doc => {
      plans.push({
        id: doc.id,
        ...doc.data()
      } as MembershipPlan);
    });

    // Apply client-side filters for complex queries
    if (filters.minPrice !== undefined) {
      plans = plans.filter(plan => plan.price >= filters.minPrice!);
    }
    if (filters.maxPrice !== undefined) {
      plans = plans.filter(plan => plan.price <= filters.maxPrice!);
    }
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      plans = plans.filter(plan => 
        plan.name.toLowerCase().includes(searchLower) ||
        plan.description?.toLowerCase().includes(searchLower) ||
        plan.type.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: plans,
      total: plans.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch membership plans', details: error },
      { status: 500 }
    );
  }
}

// POST /api/memberships - Create new membership plan
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdminPermission(request);
    if (!user || !PERMISSIONS.memberships.create.includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createMembershipSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    const membershipData: Omit<MembershipPlan, 'id'> = {
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.uid,
    };

    // Check for duplicate name
    const existingPlan = await db.collection('membershipPlans')
      .where('name', '==', membershipData.name)
      .get();

    if (!existingPlan.empty) {
      return NextResponse.json(
        { error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    // Create the membership plan
    const docRef = await db.collection('membershipPlans').add(membershipData);
    
    const newPlan: MembershipPlan = {
      id: docRef.id,
      ...membershipData
    };

    return NextResponse.json({
      success: true,
      data: newPlan,
      message: 'Membership plan created successfully'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create membership plan', details: error },
      { status: 500 }
    );
  }
}

// src/app/api/memberships/[id]/route.ts - Individual membership plan operations

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/lib/firebase/admin';
import { db } from '@/app/lib/firebase/admin';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import { 
  MembershipPlan, 
  UpdateMembershipPlanRequest,
  MEMBERSHIP_VALIDATION 
} from '@/app/types/membership';

// Validation schema for updating membership plans
const updateMembershipSchema = z.object({
  name: z.string()
    .min(MEMBERSHIP_VALIDATION.name.minLength)
    .max(MEMBERSHIP_VALIDATION.name.maxLength)
    .optional(),
  description: z.string()
    .max(MEMBERSHIP_VALIDATION.description.maxLength)
    .optional(),
  type: z.enum(['full_access', 'bjj_only', 'mma_only', 'boxing_only', 'muay_thai_only', 'kickboxing_only', 'wrestling_only', 'judo_only', 'karate_only', 'custom']).optional(),
  duration: z.enum([1, 3, 6, 12]).optional(),
  price: z.number()
    .min(MEMBERSHIP_VALIDATION.price.min)
    .max(MEMBERSHIP_VALIDATION.price.max)
    .optional(),
  currency: z.string().length(3).optional(),
  includedClasses: z.array(z.string()).min(1).optional(),
  classLimitPerMonth: z.number().min(1).optional(),
  personalTrainingIncluded: z.number().min(0).optional(),
  guestPassesIncluded: z.number().min(0).optional(),
  ageRestrictions: z.object({
    minAge: z.number().min(0).max(100).optional(),
    maxAge: z.number().min(0).max(100).optional(),
  }).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number()
    .min(MEMBERSHIP_VALIDATION.sortOrder.min)
    .max(MEMBERSHIP_VALIDATION.sortOrder.max)
    .optional(),
  maxActiveMembers: z.number().min(1).optional(),
  requiresPhysicalExam: z.boolean().optional(),
  requiresParentalConsent: z.boolean().optional(),
  autoRenewal: z.boolean().optional(),
  gracePeriodDays: z.number()
    .min(MEMBERSHIP_VALIDATION.gracePeriodDays.min)
    .max(MEMBERSHIP_VALIDATION.gracePeriodDays.max)
    .optional(),
  notes: z.string().max(1000).optional(),
});

// GET /api/memberships/[id] - Get specific membership plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAdminPermission(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const planDoc = await db.collection('membershipPlans').doc(params.id).get();
    
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const plan: MembershipPlan = {
      id: planDoc.id,
      ...planDoc.data()
    } as MembershipPlan;

    return NextResponse.json({
      success: true,
      data: plan
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch membership plan', details: error },
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
    const user = await verifyAdminPermission(request);
    if (!user || !PERMISSIONS.memberships.update.includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateMembershipSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 }
      );
    }

    // Check if plan exists
    const planDoc = await db.collection('membershipPlans').doc(params.id).get();
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (validation.data.name) {
      const existingPlan = await db.collection('membershipPlans')
        .where('name', '==', validation.data.name)
        .get();

      if (!existingPlan.empty && existingPlan.docs[0].id !== params.id) {
        return NextResponse.json(
          { error: 'A membership plan with this name already exists' },
          { status: 409 }
        );
      }
    }

    const updateData: UpdateMembershipPlanRequest = {
      ...validation.data,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: user.uid,
    };

    await db.collection('membershipPlans').doc(params.id).update(updateData);

    // Get updated document
    const updatedDoc = await db.collection('membershipPlans').doc(params.id).get();
    const updatedPlan: MembershipPlan = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as MembershipPlan;

    return NextResponse.json({
      success: true,
      data: updatedPlan,
      message: 'Membership plan updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update membership plan', details: error },
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
    const user = await verifyAdminPermission(request);
    if (!user || !PERMISSIONS.memberships.delete.includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if plan exists
    const planDoc = await db.collection('membershipPlans').doc(params.id).get();
    if (!planDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // Check if plan is being used by active members
    const activeMemberships = await db.collection('memberMemberships')
      .where('membershipPlanId', '==', params.id)
      .where('status', '==', 'active')
      .get();

    if (!activeMemberships.empty) {
      return NextResponse.json(
        { 
          error: 'Cannot delete membership plan with active members',
          details: `${activeMemberships.size} members are currently using this plan`
        },
        { status: 409 }
      );
    }

    // Soft delete: mark as inactive and archived instead of hard delete
    await db.collection('membershipPlans').doc(params.id).update({
      isActive: false,
      isPublic: false,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: user.uid,
      deletedAt: new Date().toISOString(),
      deletedBy: user.uid
    });

    return NextResponse.json({
      success: true,
      message: 'Membership plan archived successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete membership plan', details: error },
      { status: 500 }
    );
  }
}