// src/app/api/member-memberships/[id]/route.ts - Individual member membership operations

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
  
      const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
      
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
      
      // Check if membership exists
      const membershipDoc = await db.collection('memberMemberships').doc(params.id).get();
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
  
      await db.collection('memberMemberships').doc(params.id).update(updateData);
  
      // Get updated document
      const updatedDoc = await db.collection('memberMemberships').doc(params.id).get();
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