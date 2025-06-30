// src/app/api/memberships/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, getDocumentIdFromPath } from '@/app/lib/security/api-security';
import { adminDb } from '@/app/lib/firebase/admin';

// PUT - Update membership plan
export async function PUT(request: NextRequest) {
  const { session, error } = await withSecurity(request, {
    requiredRoles: ['admin'],
  });
  if (error) return error;

  const membershipId = getDocumentIdFromPath(request);
  if (!membershipId) {
    return NextResponse.json({ success: false, error: 'Membership ID required' }, { status: 400 });
  }

  const body = await request.json();
  
  await adminDb.collection('membershipPlans').doc(membershipId).update({
    ...body,
    updatedAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

// DELETE - Delete membership plan  
export async function DELETE(request: NextRequest) {
  const { session, error } = await withSecurity(request, {
    requiredRoles: ['admin'],
  });
  if (error) return error;

  const membershipId = getDocumentIdFromPath(request);
  if (!membershipId) {
    return NextResponse.json({ success: false, error: 'Membership ID required' }, { status: 400 });
  }

  await adminDb.collection('membershipPlans').doc(membershipId).delete();
  
  return NextResponse.json({ success: true });
}