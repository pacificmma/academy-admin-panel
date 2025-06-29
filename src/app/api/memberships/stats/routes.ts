// src/app/api/memberships/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, addDoc, query, where, orderBy } from 'firebase/firestore';
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

    if (minPrice && maxPrice) {
      const min = parseFloat(minPrice);
      const max = parseFloat(maxPrice);
      memberships = memberships.filter(membership =>
        membership.price >= min && membership.price <= max
      );
    }

    // Calculate stats
    const stats = {
      totalPlans: memberships.length,
      activePlans: memberships.filter(m => m.status === 'active').length,
      totalRevenue: memberships
        .filter(m => m.status === 'active')
        .reduce((sum, m) => sum + m.price, 0),
      popularPlan: memberships.find(m => m.isPopular)?.name || '',
    };

    const response: ApiResponse<MembershipPlan[]> = {
      success: true,
      data: memberships,
      stats,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch memberships' },
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

    if (!body.duration) {
      return NextResponse.json(
        { success: false, error: 'Duration is required' },
        { status: 400 }
      );
    }

    if (body.price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    if (!body.classTypes || body.classTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one class type must be selected' },
        { status: 400 }
      );
    }

    // Calculate duration in days
    const durationConfig = MEMBERSHIP_DURATIONS.find(d => d.value === body.duration);
    const durationInDays = durationConfig?.days || 0;

    // Get next display order
    const allMembershipsQuery = query(collection(db, 'membershipPlans'));
    const allMembershipsSnapshot = await getDocs(allMembershipsQuery);
    const maxDisplayOrder = Math.max(
      0,
      ...Array.from(allMembershipsSnapshot.docs).map(doc => doc.data().displayOrder || 0)
    );

    // Create membership plan data
    const membershipData: Omit<MembershipPlan, 'id'> = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      duration: body.duration,
      durationInDays,
      price: body.price,
      currency: 'USD',
      classTypes: body.classTypes,
      maxClassesPerWeek: body.maxClassesPerWeek,
      maxClassesPerMonth: body.maxClassesPerMonth,
      allowDropIns: body.allowDropIns,
      includedFeatures: body.includedFeatures || [],
      status: body.status || 'active',
      isPopular: body.isPopular || false,
      colorCode: body.colorCode || '#1976d2',
      displayOrder: maxDisplayOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, 'membershipPlans'), membershipData);

    const newMembership: MembershipPlan = {
      id: docRef.id,
      ...membershipData,
    };

    const response: ApiResponse<MembershipPlan> = {
      success: true,
      data: newMembership,
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

// src/app/api/memberships/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getSession } from '@/app/lib/auth/session';
import { UpdateMembershipPlanRequest, MembershipPlan } from '@/app/types/membership';
import { ApiResponse } from '@/app/types/api';

const db = getFirestore();

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/memberships/[id] - Get specific membership plan
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const docRef = doc(db, 'membershipPlans', params.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const membership: MembershipPlan = {
      id: docSnap.id,
      ...docSnap.data(),
    } as MembershipPlan;

    const response: ApiResponse<MembershipPlan> = {
      success: true,
      data: membership,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch membership plan' },
      { status: 500 }
    );
  }
}

// PUT /api/memberships/[id] - Update membership plan
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateMembershipPlanRequest = await request.json();

    // Validate fields if provided
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Plan name cannot be empty' },
        { status: 400 }
      );
    }

    if (body.price !== undefined && body.price < 0) {
      return NextResponse.json(
        { success: false, error: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    if (body.classTypes !== undefined && body.classTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one class type must be selected' },
        { status: 400 }
      );
    }

    // Check if membership plan exists
    const docRef = doc(db, 'membershipPlans', params.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // Calculate duration in days if duration is being updated
    let updateData: any = { ...body };
    if (body.duration) {
      const durationConfig = MEMBERSHIP_DURATIONS.find(d => d.value === body.duration);
      updateData.durationInDays = durationConfig?.days || 0;
    }

    // Add updated timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update the document
    await updateDoc(docRef, updateData);

    // Get updated document
    const updatedDocSnap = await getDoc(docRef);
    const updatedMembership: MembershipPlan = {
      id: updatedDocSnap.id,
      ...updatedDocSnap.data(),
    } as MembershipPlan;

    const response: ApiResponse<MembershipPlan> = {
      success: true,
      data: updatedMembership,
      message: 'Membership plan updated successfully',
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update membership plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/memberships/[id] - Delete membership plan
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if membership plan exists
    const docRef = doc(db, 'membershipPlans', params.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // TODO: Check if any members are currently using this membership plan
    // If yes, prevent deletion or offer to archive instead

    // Delete the document
    await deleteDoc(docRef);

    const response: ApiResponse = {
      success: true,
      message: 'Membership plan deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete membership plan' },
      { status: 500 }
    );
  }
}