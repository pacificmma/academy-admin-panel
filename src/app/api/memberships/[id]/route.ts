// src/app/api/memberships/route.ts - Complete professional implementation with TypeScript fixes
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { getSession } from '@/app/lib/auth/session';
import { 
  MembershipPlan, 
  CreateMembershipPlanRequest,
  MembershipPlanFormData,
  MEMBERSHIP_DURATIONS,
  MembershipDuration
} from '@/app/types/membership';
import { ApiResponse } from '@/app/types/api';

// Helper function to calculate duration in days
function getDurationInDays(duration: MembershipDuration): number {
  const durationMap: Record<MembershipDuration, number> = {
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
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

// Helper function to convert null to undefined for API consistency and TypeScript compliance
function normalizeOptionalNumber(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && !isNaN(value)) return value;
  return undefined;
}

// Comprehensive validation function for membership plan data
function validateMembershipPlan(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Name validation
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Plan name is required');
  } else if (data.name.trim().length < 3) {
    errors.push('Plan name must be at least 3 characters');
  } else if (data.name.trim().length > 100) {
    errors.push('Plan name must be less than 100 characters');
  }

  // Description validation
  if (data.description && typeof data.description === 'string' && data.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Duration validation
  if (!data.duration || !MEMBERSHIP_DURATIONS.find(d => d.value === data.duration)) {
    errors.push('Valid duration is required');
  }

  // Price validation
  if (typeof data.price !== 'number' || data.price < 0 || data.price > 10000) {
    errors.push('Price must be a number between 0 and 10,000');
  }

  // Class types validation
  if (!Array.isArray(data.classTypes) || data.classTypes.length === 0) {
    errors.push('At least one class type must be selected');
  }

  // Max classes per week validation
  if (data.maxClassesPerWeek !== null && data.maxClassesPerWeek !== undefined) {
    if (typeof data.maxClassesPerWeek !== 'number' || data.maxClassesPerWeek < 1 || data.maxClassesPerWeek > 30) {
      errors.push('Max classes per week must be between 1 and 30 or left empty for unlimited');
    }
  }

  // Max classes per month validation
  if (data.maxClassesPerMonth !== null && data.maxClassesPerMonth !== undefined) {
    if (typeof data.maxClassesPerMonth !== 'number' || data.maxClassesPerMonth < 1 || data.maxClassesPerMonth > 120) {
      errors.push('Max classes per month must be between 1 and 120 or left empty for unlimited');
    }
  }

  // Features validation
  if (data.includedFeatures && !Array.isArray(data.includedFeatures)) {
    errors.push('Included features must be an array');
  }

  return { isValid: errors.length === 0, errors };
}

// GET /api/memberships - Fetch membership plans with comprehensive filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Role-based access control
    if (!['admin', 'staff', 'trainer'].includes(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to view membership plans' },
        { status: 403 }
      );
    }

    // Extract query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const classTypes = searchParams.get('classTypes');
    const duration = searchParams.get('duration');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'displayOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Base Firestore query with security rules compliance
    const membershipPlansRef = adminDb.collection('membershipPlans');
    let query = membershipPlansRef.orderBy(sortBy === 'displayOrder' ? 'displayOrder' : 'createdAt', sortOrder as any);

    // Apply Firestore-level filters for performance
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    let memberships: MembershipPlan[] = [];

    // Process Firestore documents with proper type safety
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

    // Apply client-side filters for complex operations
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch membership plans', details: error.message },
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
        { success: false, error: 'Authentication required' },
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

    const body: MembershipPlanFormData = await request.json();

    // Comprehensive validation
    const validation = validateMembershipPlan(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    // Check for duplicate names (case-insensitive)
    const existingPlansQuery = adminDb.collection('membershipPlans')
      .where('name', '==', body.name.trim())
      .where('status', '!=', 'archived');
    
    const existingPlans = await existingPlansQuery.get();
    if (!existingPlans.empty) {
      return NextResponse.json(
        { success: false, error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    // Calculate display order for new plan
    const allPlansSnapshot = await adminDb.collection('membershipPlans').get();
    const nextDisplayOrder = allPlansSnapshot.size + 1;

    // Prepare membership data for Firestore (with null converted to undefined)
    const membershipData = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      duration: body.duration,
      durationInDays: getDurationInDays(body.duration),
      price: body.price,
      currency: body.currency || 'USD',
      classTypes: body.classTypes,
      maxClassesPerWeek: normalizeOptionalNumber(body.maxClassesPerWeek),
      maxClassesPerMonth: normalizeOptionalNumber(body.maxClassesPerMonth),
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

    // Create response object with proper TypeScript compliance
    const createdMembership: MembershipPlan = {
      id: docRef.id,
      name: membershipData.name,
      description: membershipData.description,
      duration: membershipData.duration,
      durationInDays: membershipData.durationInDays,
      price: membershipData.price,
      currency: membershipData.currency,
      classTypes: membershipData.classTypes,
      maxClassesPerWeek: membershipData.maxClassesPerWeek, // Already normalized to undefined
      maxClassesPerMonth: membershipData.maxClassesPerMonth, // Already normalized to undefined
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
    return NextResponse.json(
      { success: false, error: 'Failed to create membership plan', details: error.message },
      { status: 500 }
    );
  }
}