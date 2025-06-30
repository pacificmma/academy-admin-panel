
// ============================================
// FILE 1: src/app/api/member-memberships/[id]/reactivate/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { PERMISSIONS } from '@/app/lib/api/permissions';

// Utility function to verify admin permission
async function verifyMembershipPermission(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('staff').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    
    if (!userData) {
      return null;
    }
    
    if (!PERMISSIONS.members.update.includes(userData.role)) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role,
      email: userData.email,
      fullName: userData.fullName,
      isActive: userData.isActive
    };
  } catch (error) {
    return null;
  }
}

// POST /api/member-memberships/[id]/reactivate - Reactivate suspended membership
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyMembershipPermission(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // FIXED: Use adminDb instead of db
    const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
    if (!membershipDoc.exists) {
      return NextResponse.json(
        { error: 'Member membership not found' },
        { status: 404 }
      );
    }

    const membershipData = membershipDoc.data();
    if (membershipData?.status !== 'suspended') {
      return NextResponse.json(
        { error: 'Only suspended memberships can be reactivated' },
        { status: 400 }
      );
    }

    // Check if membership hasn't expired
    const endDate = new Date(membershipData.endDate);
    const now = new Date();
    
    if (endDate <= now) {
      return NextResponse.json(
        { error: 'Cannot reactivate expired membership' },
        { status: 400 }
      );
    }

    // FIXED: Use adminDb instead of db
    await adminDb.collection('memberMemberships').doc(params.id).update({
      status: 'active',
      suspensionReason: null,
      suspendedBy: null,
      suspensionDate: null,
      reactivatedBy: user.uid,
      reactivatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Membership reactivated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reactivate membership', details: error },
      { status: 500 }
    );
  }
}