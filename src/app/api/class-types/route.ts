// src/app/api/class-types/route.ts - IMPROVED WITH BETTER ERROR HANDLING
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, createdResponse, errorResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Class type validation schema
const classTypeSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

interface ClassType {
  id: string;
  name: string;
  color: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  usageCount?: number;
}

// Default class types to initialize if collection is empty
const DEFAULT_CLASS_TYPES = [
  { name: 'MMA', color: '#e53e3e', description: 'Mixed Martial Arts' },
  { name: 'BJJ', color: '#805ad5', description: 'Brazilian Jiu-Jitsu' },
  { name: 'Boxing', color: '#d69e2e', description: 'Boxing training and techniques' },
  { name: 'Muay Thai', color: '#38a169', description: 'The Art of Eight Limbs' },
  { name: 'Wrestling', color: '#3182ce', description: 'Grappling and wrestling techniques' },
  { name: 'Judo', color: '#ed8936', description: 'The gentle way martial art' },
  { name: 'Kickboxing', color: '#4299e1', description: 'Kickboxing and striking' },
  { name: 'Fitness', color: '#48bb78', description: 'General fitness and conditioning' },
  { name: 'Yoga', color: '#ed64a6', description: 'Yoga and flexibility training' },
  { name: 'Kids Martial Arts', color: '#718096', description: 'Martial arts for children' },
  { name: 'All Access', color: '#2d3748', description: 'Access to all class types' },
];

// Initialize default class types if collection is empty
async function initializeDefaultClassTypes(createdBy: string) {
  try {
    const snapshot = await adminDb.collection('classTypes').limit(1).get();
    
    if (snapshot.empty) {
      console.log('Initializing default class types...');
      const batch = adminDb.batch();
      
      for (const defaultType of DEFAULT_CLASS_TYPES) {
        const docRef = adminDb.collection('classTypes').doc();
        batch.set(docRef, {
          name: defaultType.name,
          color: defaultType.color,
          description: defaultType.description,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          createdBy,
        });
      }
      
      await batch.commit();
      console.log('Default class types initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing default class types:', error);
    // Don't throw - this is optional initialization
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
        try {
          // Count usage in classes and memberships
          const [classUsage, membershipUsage] = await Promise.all([
            adminDb.collection('classSchedules').where('classType', '==', data.name).get(),
            adminDb.collection('membershipPlans').where('classTypes', 'array-contains', data.name).get()
          ]);
          
          usageCount = classUsage.size + membershipUsage.size;
        } catch (error) {
          console.error('Error counting usage for class type:', data.name, error);
          // Continue without usage count
        }
      }
      
      classTypes.push({
        id: doc.id,
        name: data.name,
        color: data.color,
        description: data.description || '',
        isActive: data.isActive ?? true,
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

// PUT /api/class-types/[id] - Update class type
export const PUT = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session, params } = context;
    
    if (!params?.id) {
      return badRequestResponse('Class type ID is required');
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = classTypeSchema.partial().safeParse(body);
    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.errors[0]?.message || 'Invalid input');
    }

    const updateData = validationResult.data;

    // Check if class type exists
    const docRef = adminDb.collection('classTypes').doc(params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse('Class type not found', 404);
    }

    // If updating name, check for duplicates
    if (updateData.name) {
      const existingType = await adminDb.collection('classTypes')
        .where('name', '==', updateData.name)
        .where('__name__', '!=', params.id)
        .limit(1)
        .get();

      if (!existingType.empty) {
        return badRequestResponse('Class type with this name already exists');
      }
    }

    // Update the class type
    await docRef.update({
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: session.uid,
    });

    // Fetch updated document
    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data();

    const updatedClassType: ClassType = {
      id: updatedDoc.id,
      name: updatedData!.name,
      color: updatedData!.color,
      description: updatedData!.description || '',
      isActive: updatedData!.isActive ?? true,
      createdAt: updatedData!.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: updatedData!.createdBy,
      updatedBy: session.uid,
    };

    return successResponse(updatedClassType);
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

    const docRef = adminDb.collection('classTypes').doc(params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse('Class type not found', 404);
    }

    const classTypeData = doc.data();

    // Check if class type is being used
    const [classUsage, membershipUsage] = await Promise.all([
      adminDb.collection('classSchedules').where('classType', '==', classTypeData!.name).limit(1).get(),
      adminDb.collection('membershipPlans').where('classTypes', 'array-contains', classTypeData!.name).limit(1).get()
    ]);

    if (!classUsage.empty || !membershipUsage.empty) {
      return badRequestResponse('Cannot delete class type that is currently in use');
    }

    // Delete the class type
    await docRef.delete();

    return successResponse({ message: 'Class type deleted successfully' });
  } catch (error) {
    console.error('Error deleting class type:', error);
    return errorResponse('Failed to delete class type');
  }
});

// Handle OPTIONS for CORS
export async function OPTIONS() {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}