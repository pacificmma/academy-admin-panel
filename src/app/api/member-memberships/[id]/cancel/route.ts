// src/app/api/member-memberships/[id]/cancel/route.ts - Cancel membership endpoint
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
    
    // FIXED: Check if userData exists before accessing properties
    if (!userData) {
      return null;
    }
    
    // FIXED: Remove optional chaining since we've already checked userData exists
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

// POST /api/member-memberships/[id]/cancel - Cancel membership
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
          { error: 'Cancellation reason is required' },
          { status: 400 }
        );
      }
  
      // Check if membership exists and is active
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
          { error: 'Only active memberships can be cancelled' },
          { status: 400 }
        );
      }
  
      await adminDb.collection('memberMemberships').doc(params.id).update({
        status: 'cancelled',
        cancellationReason: reason.trim(),
        cancelledBy: user.uid,
        updatedAt: new Date().toISOString(),
      });
  
      return NextResponse.json({
        success: true,
        message: 'Membership cancelled successfully'
      });
  
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to cancel membership', details: error },
        { status: 500 }
      );
    }
  }