// ============================================
// FILE 2: src/app/api/member-memberships/[id]/suspend/route.ts
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

// POST /api/member-memberships/[id]/suspend - Suspend membership
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
  
      const body = await request.json();
      const { reason } = body;
  
      if (!reason || reason.trim().length === 0) {
        return NextResponse.json(
          { error: 'Suspension reason is required' },
          { status: 400 }
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
      if (membershipData?.status !== 'active') {
        return NextResponse.json(
          { error: 'Only active memberships can be suspended' },
          { status: 400 }
        );
      }
  
      // FIXED: Use adminDb instead of db
      await adminDb.collection('memberMemberships').doc(params.id).update({
        status: 'suspended',
        suspensionReason: reason.trim(),
        suspendedBy: user.uid,
        suspensionDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
  
      return NextResponse.json({
        success: true,
        message: 'Membership suspended successfully'
      });
  
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to suspend membership', details: error },
        { status: 500 }
      );
    }
  }