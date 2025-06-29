// src/app/api/member-memberships/[id]/suspend/route.ts - Suspend membership endpoint

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
  
      // Check if membership exists and is active
      const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
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
  
      await db.collection('memberMemberships').doc(params.id).update({
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