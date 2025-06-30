// src/app/api/member-memberships/[id]/route.ts - Individual member membership operations
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import { 
  MemberMembership, 
  CreateMemberMembershipRequest,
  MemberMembershipFilters 
} from '@/app/types/membership';

const createMemberMembershipSchema = z.object({
  memberId: z.string().min(1),
  membershipPlanId: z.string().min(1),
  startDate: z.string(),
  amountPaid: z.number().min(0),
  currency: z.string().length(3),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'online', 'family_plan']),
  paymentReference: z.string().optional(),
  discountApplied: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
  autoRenewal: z.boolean(),
  isChildMembership: z.boolean(),
  parentMembershipId: z.string().optional(),
  adminNotes: z.string().max(1000).optional(),
});

// Utility function to verify admin permission
async function verifyMembershipPermission(request: NextRequest, operation: 'read' | 'create' | 'update' | 'delete') {
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
    
    // Check permissions based on operation
    let hasPermission = false;
    switch (operation) {
      case 'read':
        hasPermission = PERMISSIONS.members.read.includes(userData.role) || 
                       PERMISSIONS.members.viewBasicInfo.includes(userData.role);
        break;
      case 'create':
        hasPermission = PERMISSIONS.members.create.includes(userData.role);
        break;
      case 'update':
        hasPermission = PERMISSIONS.members.update.includes(userData.role);
        break;
      case 'delete':
        hasPermission = PERMISSIONS.members.delete.includes(userData.role);
        break;
    }

    if (!hasPermission) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      role: userData.role,
      email: userData.email,
      fullName: userData.fullName
    };
  } catch (error) {
    return null;
  }
}

// GET /api/member-memberships/[id] - Get specific member membership
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const user = await verifyMembershipPermission(request, 'read');
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
  
      const membership: MemberMembership = {
        id: membershipDoc.id,
        ...membershipDoc.data()
      } as MemberMembership;
  
      return NextResponse.json({
        success: true,
        data: membership
      });
  
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch member membership', details: error },
        { status: 500 }
      );
    }
  }
  
  // PUT /api/member-memberships/[id] - Update member membership
  export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
  ) {
    try {
      const user = await verifyMembershipPermission(request, 'update');
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
  
      const body = await request.json();
      
      // FIXED: Use adminDb instead of db
      const membershipDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
      if (!membershipDoc.exists) {
        return NextResponse.json(
          { error: 'Member membership not found' },
          { status: 404 }
        );
      }
  
      const updateData = {
        ...body,
        updatedAt: new Date().toISOString(),
      };
  
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.createdBy;
  
      // FIXED: Use adminDb instead of db
      await adminDb.collection('memberMemberships').doc(params.id).update(updateData);
  
      // Get updated document
      const updatedDoc = await adminDb.collection('memberMemberships').doc(params.id).get();
      const updatedMembership: MemberMembership = {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as MemberMembership;
  
      return NextResponse.json({
        success: true,
        data: updatedMembership,
        message: 'Member membership updated successfully'
      });
  
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to update member membership', details: error },
        { status: 500 }
      );
    }
  }