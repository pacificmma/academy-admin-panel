// src/app/api/class-types/route.ts - Dynamic Class Types Management API
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, createdResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for class type
const classTypeSchema = z.object({
  name: z.string()
    .min(2, 'Class type name must be at least 2 characters')
    .max(50, 'Class type name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Class type name can only contain letters, numbers, spaces, hyphens, and ampersands'),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
    .optional(),
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  isActive: z.boolean().default(true),
});

export interface ClassType {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  usageCount: number; // How many classes/memberships use this type
}

// GET /api/class-types - Get all class types
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';

    let query: any = adminDb.collection('classTypes');
    
    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }
    
    query = query.orderBy('name', 'asc');

    const snapshot = await query.get();
    const classTypes: ClassType[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Count usage in classes and memberships
      const [classUsage, membershipUsage] = await Promise.all([
        adminDb.collection('classSchedules').where('classType', '==', data.name).get(),
        adminDb.collection('membershipPlans').where('classTypes', 'array-contains', data.name.toLowerCase().replace(/\s+/g, '_')).get()
      ]);
      
      classTypes.push({
        id: doc.id,
        name: data.name,
        color: data.color,
        description: data.description,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
        usageCount: classUsage.size + membershipUsage.size,
      });
    }

    return successResponse(classTypes);
  } catch (error) {
    return errorResponse('Failed to fetch class types');
  }
});

// POST /api/class-types - Create new class type
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();

    // Validate input
    const validationResult = classTypeSchema.safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0].message);
    }

    const { name, color, description, isActive } = validationResult.data;

    // Check if class type already exists (case-insensitive)
    const existingSnapshot = await adminDb.collection('classTypes')
      .where('name', '==', name)
      .get();

    if (!existingSnapshot.empty) {
      return badRequestResponse('A class type with this name already exists');
    }

    // Generate random color if not provided
    const finalColor = color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

    const classTypeData = {
      name,
      color: finalColor,
      description: description || '',
      isActive: isActive ?? true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
    };

    const docRef = await adminDb.collection('classTypes').add(classTypeData);

    const newClassType: ClassType = {
      id: docRef.id,
      name,
      color: finalColor,
      description: description || '',
      isActive: isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.uid,
      usageCount: 0,
    };

    return createdResponse(newClassType, 'Class type created successfully');
  } catch (error) {
    return errorResponse('Failed to create class type');
  }
});

// DELETE /api/class-types/[id] - Delete class type (soft delete if in use)
export const DELETE = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const classTypeId = pathSegments[pathSegments.length - 1];

    if (!classTypeId) {
      return badRequestResponse('Class type ID is required');
    }

    const classTypeRef = adminDb.collection('classTypes').doc(classTypeId);
    const classTypeDoc = await classTypeRef.get();

    if (!classTypeDoc.exists) {
      return errorResponse('Class type not found', 404);
    }

    const classTypeName = classTypeDoc.data()!.name;

    // Check if class type is in use
    const [classUsage, membershipUsage] = await Promise.all([
      adminDb.collection('classSchedules').where('classType', '==', classTypeName).get(),
      adminDb.collection('membershipPlans').where('classTypes', 'array-contains', classTypeName.toLowerCase().replace(/\s+/g, '_')).get()
    ]);

    const totalUsage = classUsage.size + membershipUsage.size;

    if (totalUsage > 0) {
      // Soft delete - mark as inactive
      await classTypeRef.update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: context.session.uid,
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