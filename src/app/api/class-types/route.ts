// src/app/api/class-types/route.ts - Dynamic Class Types Management API (Fixed)
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

// Default class types that should always exist
const DEFAULT_CLASS_TYPES = [
  { name: 'MMA', color: '#e53e3e' },
  { name: 'BJJ', color: '#805ad5' },
  { name: 'Boxing', color: '#d69e2e' },
  { name: 'Muay Thai', color: '#e53e3e' },
  { name: 'Wrestling', color: '#38a169' },
  { name: 'Judo', color: '#3182ce' },
  { name: 'Kickboxing', color: '#ed8936' },
  { name: 'Fitness', color: '#4299e1' },
  { name: 'Yoga', color: '#48bb78' },
  { name: 'Kids Martial Arts', color: '#ed64a6' },
];

// Initialize default class types if they don't exist
async function initializeDefaultClassTypes(createdBy: string) {
  try {
    const batch = adminDb.batch();
    
    for (const defaultType of DEFAULT_CLASS_TYPES) {
      // Check if this type already exists
      const existingType = await adminDb.collection('classTypes')
        .where('name', '==', defaultType.name)
        .limit(1)
        .get();
      
      if (existingType.empty) {
        const docRef = adminDb.collection('classTypes').doc();
        batch.set(docRef, {
          name: defaultType.name,
          color: defaultType.color,
          description: '',
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy,
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error initializing default class types:', error);
  }
}

// GET /api/class-types - Get all class types
export const GET = requireStaffOrTrainer(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const includeUsage = url.searchParams.get('includeUsage') === 'true';

    // Initialize default types if this is the first call
    await initializeDefaultClassTypes(session.uid);

    let query: any = adminDb.collection('classTypes');
    
    if (!includeInactive) {
      query = query.where('isActive', '==', true);
    }
    
    query = query.orderBy('name', 'asc');

    const snapshot = await query.get();
    const classTypes: ClassType[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      let usageCount = 0;
      
      if (includeUsage) {
        // Count usage in classes and memberships
        const [classUsage, membershipUsage] = await Promise.all([
          adminDb.collection('classSchedules').where('classType', '==', data.name).get(),
          adminDb.collection('membershipPlans').where('classTypes', 'array-contains', data.name).get()
        ]);
        
        usageCount = classUsage.size + membershipUsage.size;
      }
      
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
        usageCount,
      });
    }

    return successResponse(classTypes);
  } catch (error) {
    console.error('Error fetching class types:', error);
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
      return badRequestResponse(validationResult.error.errors[0]?.message || 'Invalid input');
    }

    const { name, color, description, isActive } = validationResult.data;

    // Check if class type with this name already exists
    const existingType = await adminDb.collection('classTypes')
      .where('name', '==', name)
      .limit(1)
      .get();

    if (!existingType.empty) {
      return badRequestResponse('Class type with this name already exists');
    }

    // Generate a default color if none provided
    const defaultColors = ['#e53e3e', '#805ad5', '#d69e2e', '#38a169', '#3182ce', '#ed8936', '#4299e1', '#48bb78', '#ed64a6'];
    const finalColor = color || defaultColors[Math.floor(Math.random() * defaultColors.length)];

    // Create the class type
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

    return createdResponse(newClassType);
  } catch (error) {
    console.error('Error creating class type:', error);
    return errorResponse('Failed to create class type');
  }
});