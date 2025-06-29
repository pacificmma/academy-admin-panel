/ src/app/api/member-memberships/[id]/reactivate/route.ts - Reactivate membership endpoint

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

    // Check if membership exists and is suspended
    const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
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

    await db.collection('memberMemberships').doc(params.id).update({
      status: 'active',
      suspensionReason: null,
      suspendedBy: null,
      suspensionDate: null,
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

// src/app/memberships/page.tsx - Main membership management page

import { redirect } from 'next/navigation';
import { getServerSession } from '@/app/lib/auth/session';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import MembershipsPageClient from './MembershipsPageClient';

export default async function MembershipsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Check permissions
  if (!PERMISSIONS.memberships.read.includes(session.role)) {
    redirect('/dashboard');
  }

  return <MembershipsPageClient session={session} />;
}