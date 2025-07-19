// src/app/api/award-types/route.ts - Award types management API
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaff, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, createdResponse } from '@/app/lib/api/response-utils';
import { FieldValue } from 'firebase-admin/firestore';

// Validation schema for creating award types
const createAwardTypeSchema = z.object({
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

// Default award types for initialization
const DEFAULT_AWARD_TYPES = [
  { title: 'White Belt', description: 'Beginning level martial arts belt' },
  { title: 'Blue Belt', description: 'Intermediate level martial arts belt' },
  { title: 'Purple Belt', description: 'Advanced level martial arts belt' },
  { title: 'Brown Belt', description: 'Expert level martial arts belt' },
  { title: 'Black Belt', description: 'Master level martial arts belt' },
  { title: 'Tournament Champion', description: 'Won a tournament competition' },
  { title: 'Monthly MVP', description: 'Most valuable participant of the month' },
  { title: 'Most Improved', description: 'Showed significant improvement' },
  { title: 'Perfect Attendance', description: 'Attended all scheduled classes' },
  { title: 'Instructor Certification', description: 'Certified to teach classes' },
  { title: 'Competition Medal', description: 'Received medal in competition' },
  { title: 'Seminar Completion', description: 'Completed specialized seminar' },
];

// GET /api/award-types - List award types
export const GET = requireStaff(async (request: NextRequest) => {
  try {
    const url = new URL(request.url);
    const includeUsage = url.searchParams.get('includeUsage') === 'true';

    const snapshot = await adminDb.collection('awardTypes')
      .orderBy('title', 'asc')
      .get();

    let awardTypes: AwardType[] = [];
    let usageCounts: Record<string, number> = {};

    // Get usage count if requested
    if (includeUsage) {
      try {
        const membersSnapshot = await adminDb.collection('members').get();
        membersSnapshot.forEach((doc) => {
          const memberData = doc.data();
          if (memberData.awards && Array.isArray(memberData.awards)) {
            memberData.awards.forEach((award: any) => {
              if (award.title) {
                usageCounts[award.title] = (usageCounts[award.title] || 0) + 1;
              }
            });
          }
        });
      } catch (err) {
        // Continue without usage counts if error occurs
        console.error('Error calculating usage counts:', err);
      }
    }

    // Process existing award types
    snapshot.forEach((doc) => {
      const data = doc.data();
      const awardType: AwardType = {
        id: doc.id,
        title: data.title,
        description: data.description,
        isActive: data.isActive ?? true,
        usageCount: includeUsage ? (usageCounts[data.title] || 0) : undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdBy: data.createdBy || 'system',
        updatedBy: data.updatedBy,
      };
      awardTypes.push(awardType);
    });

    // If no award types exist, create default ones
    if (awardTypes.length === 0) {
      for (const defaultType of DEFAULT_AWARD_TYPES) {
        try {
          const docRef = await adminDb.collection('awardTypes').add({
            ...defaultType,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy: 'system',
          });

          awardTypes.push({
            id: docRef.id,
            ...defaultType,
            isActive: true,
            usageCount: includeUsage ? 0 : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'system',
          });
        } catch (err) {
          console.error('Error creating default award type:', err);
          // Continue with other types if one fails
        }
      }
    }

    return successResponse(awardTypes);

  } catch (err) {
    console.error('Error in GET /api/award-types:', err);
    return errorResponse('Failed to fetch award types', 500);
  }
});

// POST /api/award-types - Create new award type
export const POST = requireStaff(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();
    const validation = createAwardTypeSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { 
        validationErrors: validation.error.issues 
      });
    }

    // Check if award type with same title already exists
    const existingSnapshot = await adminDb.collection('awardTypes')
      .where('title', '==', validation.data.title)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return errorResponse('Award type with this title already exists', 409);
    }

    // Create the award type
    const awardTypeData = {
      ...validation.data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: session.uid,
    };

    const docRef = await adminDb.collection('awardTypes').add(awardTypeData);

    const newAwardType: AwardType = {
      id: docRef.id,
      ...validation.data,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.uid,
    };

    return createdResponse(newAwardType, 'Award type created successfully');

  } catch (err) {
    console.error('Error in POST /api/award-types:', err);
    return errorResponse('Failed to create award type', 500);
  }
});