// src/app/api/members/[id]/route.ts - Secure Member ID API
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { withSecurity, handleError, sanitizeOutput, getDocumentIdFromPath } from '@/app/lib/security/api-security';
import { validateMemberInput } from '@/app/lib/security/validation';

// GET /api/members/[id] - Get specific member
export async function GET(request: NextRequest) {
  try {
    // Apply security checks
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin', 'staff'],
      rateLimit: { maxRequests: 200, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Extract member ID from URL
    const memberId = getDocumentIdFromPath(request);
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get member document
      const memberDoc = await adminDb.collection('members').doc(memberId).get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      let memberData = { id: memberDoc.id, ...memberDoc.data() };

      // If member has parent, include parent info
      if (memberData.parentId) {
        try {
          const parentDoc = await adminDb.collection('members').doc(memberData.parentId).get();
          if (parentDoc.exists) {
            memberData.parentInfo = {
              id: parentDoc.id,
              firstName: parentDoc.data()?.firstName,
              lastName: parentDoc.data()?.lastName,
              email: parentDoc.data()?.email
            };
          }
        } catch (parentError) {
          // Parent info is optional, continue without it
        }
      }

      // If member is a parent, include children info
      try {
        const childrenSnapshot = await adminDb.collection('members')
          .where('parentId', '==', memberId)
          .get();
        
        if (!childrenSnapshot.empty) {
          memberData.children = childrenSnapshot.docs.map(doc => ({
            id: doc.id,
            firstName: doc.data().firstName,
            lastName: doc.data().lastName,
            email: doc.data().email,
            membershipStatus: doc.data().membershipStatus
          }));
        }
      } catch (childrenError) {
        // Children info is optional, continue without it
      }

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(memberData)
      });

    } catch (dbError: any) {
      throw new Error('Failed to fetch member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// PUT /api/members/[id] - Update member
export async function PUT(request: NextRequest) {
  try {
    // Apply security checks
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 50, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Extract member ID from URL
    const memberId = getDocumentIdFromPath(request);
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    const validation = validateMemberInput(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors[0] },
        { status: 400 }
      );
    }

    const { sanitizedData } = validation;

    try {
      // Check if member exists
      const memberRef = adminDb.collection('members').doc(memberId);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // Check if email is already used by another member
      if (sanitizedData.email !== memberDoc.data()?.email) {
        const existingMember = await adminDb.collection('members')
          .where('email', '==', sanitizedData.email)
          .get();

        if (!existingMember.empty && existingMember.docs[0].id !== memberId) {
          return NextResponse.json(
            { success: false, error: 'Email already exists' },
            { status: 409 }
          );
        }
      }

      // If parentId is being changed, verify new parent exists
      if (sanitizedData.parentId && sanitizedData.parentId !== memberDoc.data()?.parentId) {
        // Check for circular reference (member can't be their own parent)
        if (sanitizedData.parentId === memberId) {
          return NextResponse.json(
            { success: false, error: 'Member cannot be their own parent' },
            { status: 400 }
          );
        }

        const parentDoc = await adminDb.collection('members').doc(sanitizedData.parentId).get();
        if (!parentDoc.exists) {
          return NextResponse.json(
            { success: false, error: 'Parent member not found' },
            { status: 400 }
          );
        }

        // Check if the new parent is actually a child of this member (prevent cycles)
        const parentData = parentDoc.data();
        if (parentData?.parentId === memberId) {
          return NextResponse.json(
            { success: false, error: 'Cannot create circular parent-child relationship' },
            { status: 400 }
          );
        }
      }

      // Update with audit fields
      const updateData = {
        ...sanitizedData,
        updatedBy: session!.uid,
        updatedAt: new Date(),
      };

      await memberRef.update(updateData);

      // Get updated document
      const updatedDoc = await memberRef.get();
      const result = { id: updatedDoc.id, ...updatedDoc.data() };

      return NextResponse.json({
        success: true,
        data: sanitizeOutput(result)
      });

    } catch (dbError: any) {
      throw new Error('Failed to update member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}

// DELETE /api/members/[id] - Delete (deactivate) member
export async function DELETE(request: NextRequest) {
  try {
    // Apply security checks (only admins can delete)
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 20, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

    // Extract member ID from URL
    const memberId = getDocumentIdFromPath(request);
    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if member exists
      const memberRef = adminDb.collection('members').doc(memberId);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      // Check if member has children - warn about orphaning
      const childrenSnapshot = await adminDb.collection('members')
        .where('parentId', '==', memberId)
        .get();

      if (!childrenSnapshot.empty) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete member with children. Please reassign children first or use force=true parameter.',
            children: childrenSnapshot.docs.map(doc => ({
              id: doc.id,
              name: `${doc.data().firstName} ${doc.data().lastName}`
            }))
          },
          { status: 400 }
        );
      }

      // Soft delete (deactivate) instead of hard delete
      await memberRef.update({
        membershipStatus: 'deleted',
        isActive: false,
        deletedBy: session!.uid,
        deletedAt: new Date(),
        updatedBy: session!.uid,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Member deleted successfully'
      });

    } catch (dbError: any) {
      throw new Error('Failed to delete member');
    }

  } catch (error: any) {
    return handleError(error);
  }
}