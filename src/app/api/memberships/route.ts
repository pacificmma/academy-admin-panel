// src/app/api/memberships/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { getSession } from '@/app/lib/auth/session';
import { 
  MembershipPlan, 
  CreateMembershipPlanRequest, 
  MEMBERSHIP_DURATIONS 
} from '@/app/types/membership';
import { ApiResponse } from '@/app/types/api';

const db = getFirestore();

// GET /api/memberships - Get all membership plans
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const classTypes = searchParams.get('classTypes');
    const duration = searchParams.get('duration');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    // Build base query
    let membershipQuery = query(
      collection(db, 'membershipPlans'),
      orderBy('displayOrder', 'asc'),
      orderBy('createdAt', 'desc')
    );

    // Apply filters
    if (status) {
      const statusArray = status.split(',');
      membershipQuery = query(membershipQuery, where('status', 'in', statusArray));
    }

    const querySnapshot = await getDocs(membershipQuery);
    let memberships: MembershipPlan[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      memberships.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      } as MembershipPlan);
    });

    // Apply client-side filters (for complex filtering)
    if (search) {
      const searchLower = search.toLowerCase();
      memberships = memberships.filter(membership =>
        membership.name.toLowerCase().includes(searchLower) ||
        membership.description?.toLowerCase().includes(searchLower)
      );
    }

    if (classTypes) {
      const classTypesArray = classTypes.split(',');
      memberships = memberships.filter(membership =>
        classTypesArray.some(type => membership.classTypes.includes(type as any))
      );
    }

    if (duration) {
      const durationArray = duration.split(',');
      memberships = memberships.filter(membership =>
        durationArray.includes(membership.duration)
      );
    }

    if (minPrice) {
      const minPriceNum = parseFloat(minPrice);
      memberships = memberships.filter(membership => membership.price >= minPriceNum);
    }

    if (maxPrice) {
      const maxPriceNum = parseFloat(maxPrice);
      memberships = memberships.filter(membership => membership.price <= maxPriceNum);
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
      { success: false, error: error.message || 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}

// POST /api/memberships - Create new membership plan
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateMembershipPlanRequest = await request.json();

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Plan name is required' },
        { status: 400 }
      );
    }

    if (!body.duration || !MEMBERSHIP_DURATIONS.find(d => d.value === body.duration)) {
      return NextResponse.json(
        { success: false, error: 'Valid duration is required' },
        { status: 400 }
      );
    }

    if (typeof body.price !== 'number' || body.price < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid price is required' },
        { status: 400 }
      );
    }

    if (!body.classTypes || body.classTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one class type must be selected' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingQuery = query(
      collection(db, 'membershipPlans'),
      where('name', '==', body.name.trim())
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    // Get next display order
    const allPlansQuery = query(collection(db, 'membershipPlans'));
    const allPlansSnapshot = await getDocs(allPlansQuery);
    const nextDisplayOrder = allPlansSnapshot.size + 1;

    // Create membership plan data
    const membershipData = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      duration: body.duration,
      price: body.price,
      classTypes: body.classTypes,
      maxClassesPerWeek: body.maxClassesPerWeek || null,
      maxClassesPerMonth: body.maxClassesPerMonth || null,
      allowDropIns: body.allowDropIns ?? true,
      includedFeatures: body.includedFeatures || [],
      status: body.status || 'active',
      isPopular: body.isPopular || false,
      colorCode: body.colorCode || '#1976d2',
      displayOrder: nextDisplayOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: session.uid,
    };

    // Add to Firestore
    const docRef = await addDoc(collection(db, 'membershipPlans'), membershipData);

    const createdMembership: MembershipPlan = {
      id: docRef.id,
      ...membershipData,
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as MembershipPlan;

    const response: ApiResponse<MembershipPlan> = {
      success: true,
      data: createdMembership,
      message: 'Membership plan created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create membership plan' },
      { status: 500 }
    );
  }
}