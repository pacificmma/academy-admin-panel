// src/app/api/class-types/[id]/route.ts - Individual Class Type Management
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

    // Validate input
    const validationResult = updateClassTypeSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message);
    }

    const classTypeRef = adminDb.collection('classTypes').doc(params.id);
    const classTypeDoc = await classTypeRef.get();

    if (!classTypeDoc.exists) {
      return notFoundResponse('Class type');
    }

    const currentData = classTypeDoc.data()!;
    const { name, color, description, isActive } = validationResult.data;

    // If name is being changed, check for duplicates
    if (name && name !== currentData.name) {
      const existingSnapshot = await adminDb.collection('classTypes')
        .where('name', '==', name)
        .get();

      if (!existingSnapshot.empty) {
        return badRequestResponse('A class type with this name already exists');
      }

      // If name is changing, update all references
      const batch = adminDb.batch();

      // Update class schedules
      const classSchedulesSnapshot = await adminDb.collection('classSchedules')
        .where('classType', '==', currentData.name)
        .get();

      classSchedulesSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          classType: name,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      // Update class instances
      const classInstancesSnapshot = await adminDb.collection('classInstances')
        .where('classType', '==', currentData.name)
        .get();

      classInstancesSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          classType: name,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      // Update membership plans (replace in classTypes array)
      const membershipPlansSnapshot = await adminDb.collection('membershipPlans')
        .where('classTypes', 'array-contains', currentData.name)
        .get();

      membershipPlansSnapshot.forEach(doc => {
        const data = doc.data();
        const updatedClassTypes = data.classTypes.map((ct: string) => 
          ct === currentData.name ? name : ct
        );
        batch.update(doc.ref, {
          classTypes: updatedClassTypes,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      // Commit all updates
      await batch.commit();
    }

    // Update the class type itself
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    };

    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    await classTypeRef.update(updateData);

    // Return updated class type
    const updatedDoc = await classTypeRef.get();
    const updatedData = updatedDoc.data()!;

    // Count usage after update
    const [classUsage, membershipUsage] = await Promise.all([
      adminDb.collection('classSchedules').where('classType', '==', updatedData.name).get(),
      adminDb.collection('membershipPlans').where('classTypes', 'array-contains', updatedData.name).get()
    ]);

    const updatedClassType = {
      id: updatedDoc.id,
      name: updatedData.name,
      color: updatedData.color,
      description: updatedData.description,
      isActive: updatedData.isActive,
      createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: updatedData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdBy: updatedData.createdBy,
      updatedBy: updatedData.updatedBy,
      usageCount: classUsage.size + membershipUsage.size,
    };

    return successResponse(updatedClassType, 'Class type updated successfully');
  } catch (error) {
    return errorResponse('Failed to update class type');
  }
});

// DELETE /api/class-types/[id] - Delete class type
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { params, session } = context;
    if (!params?.id) {
      return badRequestResponse('Class type ID is required');
    }

    const classTypeRef = adminDb.collection('classTypes').doc(params.id);
    const classTypeDoc = await classTypeRef.get();

    if (!classTypeDoc.exists) {
      return notFoundResponse('Class type');
    }

    const classTypeName = classTypeDoc.data()!.name;

    // Check if class type is in use
    const [classUsage, membershipUsage] = await Promise.all([
      adminDb.collection('classSchedules').where('classType', '==', classTypeName).get(),
      adminDb.collection('membershipPlans').where('classTypes', 'array-contains', classTypeName).get()
    ]);

    const totalUsage = classUsage.size + membershipUsage.size;

    if (totalUsage > 0) {
      // Soft delete - mark as inactive
      await classTypeRef.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: session.uid,
      });
      
      return successResponse({ 
        message: `Class type marked as inactive because it's used in ${totalUsage} classes/memberships`,
        softDeleted: true 
      });
    } else {
      // Hard delete
      await classTypeRef.delete();
      
      return successResponse({ 
        message: 'Class type deleted successfully',
        softDeleted: false 
      });
    }
  } catch (error) {
    return errorResponse('Failed to delete class type');
  }
});