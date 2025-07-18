// src/app/api/class-types/[id]/route.ts - Individual Class Type Management (Fixed)
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { z } from 'zod';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, notFoundResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for updating class type
const updateClassTypeSchema = z.object({
  name: z.string()
    .min(2, 'Class type name must be at least 2 characters')
    .max(50, 'Class type name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Class type name can only contain letters, numbers, spaces, hyphens, and ampersands')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
    .optional(),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  isActive: z.boolean().optional(),
});

// GET /api/class-types/[id] - Get specific class type
export const GET = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return badRequestResponse('Class type ID is required');
    }

    const classTypeDoc = await adminDb.collection('classTypes').doc(params.id).get();

    if (!classTypeDoc.exists) {
      return notFoundResponse('Class type');
    }

    const data = classTypeDoc.data()!;

    // Count usage in classes and memberships
    const [classUsage, membershipUsage] = await Promise.all([
      adminDb.collection('classSchedules').where('classType', '==', data.name).get(),
      adminDb.collection('membershipPlans').where('classTypes', 'array-contains', data.name).get()
    ]);

    const classType = {
      id: classTypeDoc.id,
      name: data.name,
      color: data.color,
      description: data.description,
      isActive: data.isActive,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      usageCount: classUsage.size + membershipUsage.size,
    };

    return successResponse(classType);
  } catch (error) {
    console.error('Error fetching class type:', error);
    return errorResponse('Failed to fetch class type');
  }
});

// PUT /api/class-types/[id] - Update class type
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return badRequestResponse('Class type ID is required');
    }

    const body = await request.json();
    const validationResult = updateClassTypeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0]?.message || 'Invalid input');
    }

    const classTypeRef = adminDb.collection('classTypes').doc(params.id);
    const classTypeDoc = await classTypeRef.get();

    if (!classTypeDoc.exists) {
      return notFoundResponse('Class type');
    }

    const updates = validationResult.data;

    // If name is being updated, check for duplicates
    if (updates.name) {
      const existingType = await adminDb.collection('classTypes')
        .where('name', '==', updates.name)
        .limit(1)
        .get();

      if (!existingType.empty && existingType.docs[0].id !== params.id) {
        return badRequestResponse('Class type with this name already exists');
      }
    }

    const updateData = {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    await classTypeRef.update(updateData);

    const updatedDoc = await classTypeRef.get();
    const updatedData = updatedDoc.data()!;

    return successResponse({
      id: updatedDoc.id,
      name: updatedData.name,
      color: updatedData.color,
      description: updatedData.description,
      isActive: updatedData.isActive,
      createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: updatedData.createdBy,
      updatedBy: updatedData.updatedBy,
    });
  } catch (error) {
    console.error('Error updating class type:', error);
    return errorResponse('Failed to update class type');
  }
});

// DELETE /api/class-types/[id] - Delete class type
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params } = context;
    if (!params?.id) {
      return badRequestResponse('Class type ID is required');
    }

    const classTypeRef = adminDb.collection('classTypes').doc(params.id);
    const classTypeDoc = await classTypeRef.get();

    if (!classTypeDoc.exists) {
      return notFoundResponse('Class type');
    }

    const data = classTypeDoc.data()!;

    // Check if class type is being used in classes or memberships
    const [classUsage, membershipUsage] = await Promise.all([
      adminDb.collection('classSchedules').where('classType', '==', data.name).get(),
      adminDb.collection('membershipPlans').where('classTypes', 'array-contains', data.name).get()
    ]);

    if (classUsage.size > 0 || membershipUsage.size > 0) {
      return badRequestResponse(
        `Cannot delete class type "${data.name}" because it is being used in ${classUsage.size} classes and ${membershipUsage.size} membership plans. Please remove all references first.`
      );
    }

    await classTypeRef.delete();

    return successResponse({ message: 'Class type deleted successfully' });
  } catch (error) {
    console.error('Error deleting class type:', error);
    return errorResponse('Failed to delete class type');
  }
});