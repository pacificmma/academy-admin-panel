// src/app/api/memberships/route.ts - Complete professional implementation
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { getSession } from '@/app/lib/auth/session';
import { 
  MembershipPlan, 
  CreateMembershipPlanRequest,
  MEMBERSHIP_DURATIONS,
  MembershipDuration
} from '@/app/types/membership';
import { ApiResponse } from '@/app/types/api';

// Helper function to calculate duration in days
function getDurationInDays(duration: MembershipDuration): number {
  const durationMap = {
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
    'unlimited': 9999
  };
  return durationMap[duration];
}

// Helper function to safely convert Firestore timestamp
function convertTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  return new Date().toISOString();
}

// Helper function to convert null to undefined for API consistency
function normalizeOptionalNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return undefined;
}

// Validation function for membership plan data
function validateMembershipPlan(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Plan name is required');
  } else if (data.name.trim().length < 3) {
    errors.push('Plan name must be at least 3 characters');
  } else if (data.name.trim().length > 100) {
    errors.push('Plan name must be less than 100 characters');
  }

  if (data.description && typeof data.description === 'string' && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  if (!data.duration || !MEMBERSHIP_DURATIONS.find(d => d.value === data.duration)) {
    errors.push('Valid duration is required');
  }

  if (typeof data.price !== 'number' || data.price < 0 || data.price > 10000) {
    errors.push('Price must be a number between 0 and 10000');
  }

  if (!Array.isArray(data.classTypes) || data.classTypes.length === 0) {
    errors.push('At least one class type must be selected');
  }

  if (data.maxClassesPerWeek !== null && data.maxClassesPerWeek !== undefined) {
    if (typeof data.maxClassesPerWeek !== 'number' || data.maxClassesPerWeek < 1 || data.maxClassesPerWeek > 30) {
      errors.push('Max classes per week must be between 1 and 30 or left empty for unlimited');
    }
  }

  if (data.maxClassesPerMonth !== null && data.maxClassesPerMonth !== undefined) {
    if (typeof data.maxClassesPerMonth !== 'number' || data.maxClassesPerMonth < 1 || data.maxClassesPerMonth > 120) {
      errors.push('Max classes per month must be between 1 and 120 or left empty for unlimited');
    }
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/memberships - Fetch membership plans
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins and staff can view membership plans
    if (!['admin', 'staff', 'trainer'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const classTypes = searchParams.get('classTypes');
    const duration = searchParams.get('duration');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    // Fetch membership plans from Firestore using Admin SDK
    const membershipPlansRef = adminDb.collection('membershipPlans');
    let query = membershipPlansRef.orderBy('displayOrder', 'asc');

    // Apply Firestore-level filters where possible
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let memberships: MembershipPlan[] = [];

    // Process each document
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      const membership: MembershipPlan = {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        duration: data.duration,
        durationInDays: data.durationInDays || getDurationInDays(data.duration),
        price: data.price || 0,
        currency: data.currency || 'USD',
        classTypes: data.classTypes || [],
        maxClassesPerWeek: normalizeOptionalNumber(data.maxClassesPerWeek),
        maxClassesPerMonth: normalizeOptionalNumber(data.maxClassesPerMonth),
        allowDropIns: data.allowDropIns ?? true,
        includedFeatures: data.includedFeatures || [],
        status: data.status || 'active',
        isPopular: data.isPopular || false,
        colorCode: data.colorCode || '#1976d2',
        displayOrder: data.displayOrder || 0,
        memberCount: data.memberCount || 0,
        createdBy: data.createdBy,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
      };

      memberships.push(membership);
    });

    // Apply client-side filters for complex filtering
    if (search) {
      const searchLower = search.toLowerCase();
      memberships = memberships.filter(membership =>
        membership.name.toLowerCase().includes(searchLower) ||
        (membership.description && membership.description.toLowerCase().includes(searchLower))
      );
    }

    if (classTypes) {
      const classTypesArray = classTypes.split(',').filter(type => type.trim());
      if (classTypesArray.length > 0) {
        memberships = memberships.filter(membership =>
          classTypesArray.some(type => membership.classTypes.includes(type as any))
        );
      }
    }

    if (duration) {
      const durationArray = duration.split(',').filter(d => d.trim());
      if (durationArray.length > 0) {
        memberships = memberships.filter(membership =>
          durationArray.includes(membership.duration)
        );
      }
    }

    if (minPrice) {
      const minPriceNum = parseFloat(minPrice);
      if (!isNaN(minPriceNum)) {
        memberships = memberships.filter(membership => membership.price >= minPriceNum);
      }
    }

    if (maxPrice) {
      const maxPriceNum = parseFloat(maxPrice);
      if (!isNaN(maxPriceNum)) {
        memberships = memberships.filter(membership => membership.price <= maxPriceNum);
      }
    }

    const response: ApiResponse<MembershipPlan[]> = {
      success: true,
      data: memberships,
      meta: {
        total: memberships.length,
        filters: {
          search,
          status,
          classTypes,
          duration,
          minPrice,
          maxPrice,
        },
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching membership plans:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}

// POST /api/memberships - Create new membership plan
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can create membership plans
    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only administrators can create membership plans' },
        { status: 403 }
      );
    }

    // Parse request body
    let body: CreateMembershipPlanRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate the membership plan data
    const validation = validateMembershipPlan(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingPlan = await adminDb.collection('membershipPlans')
      .where('name', '==', body.name.trim())
      .get();
    
    if (!existingPlan.empty) {
      return NextResponse.json(
        { success: false, error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    // Get next display order
    const allPlansSnapshot = await adminDb.collection('membershipPlans').get();
    const nextDisplayOrder = allPlansSnapshot.size + 1;

    // Calculate duration in days
    const durationInDays = getDurationInDays(body.duration);

    // Create membership plan data for Firestore
    const membershipData = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      duration: body.duration,
      durationInDays,
      price: body.price,
      currency: 'USD', // Default currency - could be made configurable
      classTypes: body.classTypes,
      maxClassesPerWeek: body.maxClassesPerWeek || null, // Store null for unlimited
      maxClassesPerMonth: body.maxClassesPerMonth || null, // Store null for unlimited
      allowDropIns: body.allowDropIns ?? true,
      includedFeatures: body.includedFeatures || [],
      status: body.status || 'active',
      isPopular: body.isPopular || false,
      colorCode: body.colorCode || '#1976d2',
      displayOrder: nextDisplayOrder,
      memberCount: 0, // Initial member count
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.uid,
    };

    // Add to Firestore using Admin SDK
    const docRef = await adminDb.collection('membershipPlans').add(membershipData);

    // Create response object with proper type conversion
    const createdMembership: MembershipPlan = {
      id: docRef.id,
      name: membershipData.name,
      description: membershipData.description,
      duration: membershipData.duration,
      durationInDays: membershipData.durationInDays,
      price: membershipData.price,
      currency: membershipData.currency,
      classTypes: membershipData.classTypes,
      maxClassesPerWeek: normalizeOptionalNumber(membershipData.maxClassesPerWeek),
      maxClassesPerMonth: normalizeOptionalNumber(membershipData.maxClassesPerMonth),
      allowDropIns: membershipData.allowDropIns,
      includedFeatures: membershipData.includedFeatures,
      status: membershipData.status,
      isPopular: membershipData.isPopular,
      colorCode: membershipData.colorCode,
      displayOrder: membershipData.displayOrder,
      memberCount: membershipData.memberCount,
      createdBy: membershipData.createdBy,
      createdAt: membershipData.createdAt.toISOString(),
      updatedAt: membershipData.updatedAt.toISOString(),
    };

    const response: ApiResponse<MembershipPlan> = {
      success: true,
      data: createdMembership,
      message: 'Membership plan created successfully',
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('Error creating membership plan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create membership plan' },
      { status: 500 }
    );
  }
}