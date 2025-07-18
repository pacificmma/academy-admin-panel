// src/app/api/class-types/route.ts - FIXED VERSION WITH BETTER ERROR HANDLING
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { z } from 'zod';
import { requireAdmin, requireStaffOrTrainer, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, createdResponse, errorResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Class type validation schema
const classTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters').trim(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isActive: z.boolean().optional(),
});

const updateClassTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters').trim().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
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
    }
  } catch (error) {
    // Don't throw - this is optional initialization
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

    // Initialize default types if this is the first call and user is admin
    if (session.role === 'admin') {
      await initializeDefaultClassTypes(session.uid);
    }

    // Fetch all class types and filter/sort in memory to avoid index requirements
    const snapshot = await adminDb.collection('classTypes').get();
    const classTypes: ClassType[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Skip inactive types if not requested
      if (!includeInactive && data.isActive === false) {
        continue;
      }
      
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
        name: data.name || '',
        color: data.color || '#718096',
        description: data.description || '',
        isActive: data.isActive ?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdBy: data.createdBy || '',
        updatedBy: data.updatedBy,
        usageCount,
      });
    }

    // Sort by name in memory
    classTypes.sort((a, b) => a.name.localeCompare(b.name));

    return successResponse(classTypes);
  } catch (error) {
    console.error('Error fetching class types:', error);
    return errorResponse('Failed to fetch class types', 500);
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
      const firstError = validationResult.error.errors[0];
      return badRequestResponse(firstError?.message || 'Invalid input');
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
    
    if (error instanceof z.ZodError) {
      return badRequestResponse('Validation failed: ' + error.errors[0]?.message);
    }
    
    return errorResponse('Failed to create class type', 500);
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