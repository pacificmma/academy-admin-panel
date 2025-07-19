// src/app/api/award-types/[id]/route.ts - Individual award type management
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';

// Validation schema for updating award types
const updateAwardTypeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isActive: z.boolean().default(true),
});

// Award Type interface
interface AwardType {
  id: string;
  title: string;
  description?: string;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

// GET /api/award-types/[id] - Get single award type
export const GET = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return notFoundResponse('Award type');
    }

    const doc = await adminDb.collection('awardTypes').doc(params.id).get();
    
    if (!doc.exists) {
      return notFoundResponse('Award type');
    }

    const data = doc.data();
    const awardType: AwardType = {
      id: doc.id,
      title: data?.title,
      description: data?.description,
      isActive: data?.isActive ?? true,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data?.createdBy,
      updatedBy: data?.updatedBy,
    };

    return successResponse(awardType);

  } catch (err) {
    return errorResponse('Failed to fetch award type', 500, { details: err });
  }
});

// PUT /api/award-types/[id] - Update award type
export const PUT = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return notFoundResponse('Award type');
    }

    const body = await request.json();
    const validation = updateAwardTypeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { validationErrors: validation.error.issues });
    }

    // Check if award type exists
    const doc = await adminDb.collection('awardTypes').doc(params.id).get();
    if (!doc.exists) {
      return notFoundResponse('Award type');
    }

    const currentData = doc.data();

    // Check if another award type with same title exists (excluding current one)
    if (validation.data.title !== currentData?.title) {
      const existingSnapshot = await adminDb.collection('awardTypes')
        .where('title', '==', validation.data.title)
        .limit(1)
        .get();

      if (!existingSnapshot.empty && existingSnapshot.docs[0].id !== params.id) {
        return errorResponse('Award type with this title already exists', 409);
      }
    }

    // Update the award type
    const updateData = {
      ...validation.data,
      updatedAt: new Date(),
      updatedBy: session.uid,
    };

    await adminDb.collection('awardTypes').doc(params.id).update(updateData);

    const updatedAwardType: AwardType = {
      id: params.id,
      ...validation.data,
      createdAt: currentData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentData?.createdBy,
      updatedBy: session.uid,
    };

    return successResponse(updatedAwardType, 'Award type updated successfully');

  } catch (err) {
    return errorResponse('Failed to update award type', 500, { details: err });
  }
});

// DELETE /api/award-types/[id] - Delete award type
export const DELETE = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return notFoundResponse('Award type');
    }

    // Check if award type exists
    const doc = await adminDb.collection('awardTypes').doc(params.id).get();
    if (!doc.exists) {
      return notFoundResponse('Award type');
    }

    const awardTypeData = doc.data();
    const awardTypeTitle = awardTypeData?.title;

    if (!awardTypeTitle) {
      return badRequestResponse('Invalid award type data');
    }

    // Check if award type is being used by any members
    const membersSnapshot = await adminDb.collection('members')
      .where('awards', 'array-contains-any', [{ title: awardTypeTitle }])
      .limit(1)
      .get();

    // More thorough check - scan all members for this award title
    const allMembersSnapshot = await adminDb.collection('members').get();
    let usageCount = 0;

    allMembersSnapshot.forEach((memberDoc) => {
      const memberData = memberDoc.data();
      if (memberData.awards && Array.isArray(memberData.awards)) {
        const hasAward = memberData.awards.some((award: any) => award.title === awardTypeTitle);
        if (hasAward) {
          usageCount++;
        }
      }
    });

    if (usageCount > 0) {
      return badRequestResponse(`Cannot delete award type "${awardTypeTitle}" - it is being used by ${usageCount} member(s)`);
    }

    // Delete the award type
    await adminDb.collection('awardTypes').doc(params.id).delete();

    return successResponse(null, 'Award type deleted successfully');

  } catch (err) {
    return errorResponse('Failed to delete award type', 500, { details: err });
  }
});