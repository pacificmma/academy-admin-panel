// src/app/api/memberships/route.ts - CORRECTED with proper imports and week support
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { validateAPIAccess } from '@/app/lib/auth/session';
import { MembershipPlan, CreateMembershipPlanRequest } from '@/app/types/membership';
import type { Query, DocumentData } from 'firebase-admin/firestore';

// ============================================
// SECURITY & VALIDATION
// ============================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
}

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getClientIP(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  return xForwardedFor?.split(',')[0].trim() || 'unknown';
}

function checkRateLimit(ip: string, maxRequests = 50, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  let requestInfo = requestCounts.get(ip);
  
  if (!requestInfo || requestInfo.resetTime <= windowStart) {
    requestInfo = { count: 1, resetTime: now + windowMs };
    requestCounts.set(ip, requestInfo);
    return true;
  }
  
  if (requestInfo.count >= maxRequests) {
    return false;
  }
  
  requestInfo.count++;
  return true;
}

// Validation function for membership plan data - UPDATED WITH WEEK SUPPORT
function validateMembershipPlanData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status, currency } = data;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    errors.push('Name is required and must be at least 3 characters');
  } else if (name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  // Validate description (optional)
  if (description && typeof description !== 'string') {
    errors.push('Description must be a string');
  } else if (description && description.trim().length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Validate duration (updated with week options)
  const validDurations = ['1_week', '2_weeks', '3_weeks', '4_weeks', '1_month', '3_months', '6_months', '12_months', 'unlimited'];
  if (!duration || typeof duration !== 'string' || !validDurations.includes(duration)) {
    errors.push('Duration must be one of: 1_week, 2_weeks, 3_weeks, 4_weeks, 1_month, 3_months, 6_months, 12_months, unlimited');
  }

  // Validate price
  if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
    errors.push('Price is required and must be a positive number');
  } else if (price > 10000) {
    errors.push('Price must be less than $10,000');
  }

  // Validate class types
  if (!Array.isArray(classTypes) || classTypes.length === 0) {
    errors.push('At least one class type must be selected');
  } else {
    const validClassTypes = ['bjj', 'mma', 'muay_thai', 'boxing', 'general_fitness', 'all'];
    for (const type of classTypes) {
      if (typeof type !== 'string' || !validClassTypes.includes(type)) {
        errors.push('Invalid class type: ' + type);
        break;
      }
    }
  }

  // Validate status
  const validStatuses = ['active', 'inactive', 'archived'];
  if (status && !validStatuses.includes(status)) {
    errors.push('Status must be one of: active, inactive, archived');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Convert duration to days for storage (updated with week options)
  const durationToDays: Record<string, number> = {
    '1_week': 7,
    '2_weeks': 14,
    '3_weeks': 21,
    '4_weeks': 28,
    '1_month': 30,
    '3_months': 90,
    '6_months': 180,
    '12_months': 365,
    'unlimited': 9999
  };

  const durationInDays = durationToDays[duration] || 30;

  // Sanitize and prepare data for storage
  const sanitizedData = {
    name: name.trim(),
    description: description?.trim() || '',
    duration: duration.trim(),
    durationInDays,
    price: Math.round(price * 100) / 100, // Round to 2 decimal places
    classTypes: classTypes.map((type: string) => type.trim()),
    status: status || 'active',
    currency: currency?.trim() || 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    displayOrder: 0,
  };

  return { isValid: true, errors: [], sanitizedData };
}

// ============================================
// API ENDPOINTS
// ============================================

// GET - Fetch all membership plans
export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientIP = getClientIP(request);

  try {
    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Validate API access
    const { session } = await validateAPIAccess(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - properly typed
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = adminDb.collection('membershipPlans');

    // Apply filters
    if (status && ['active', 'inactive', 'archived'].includes(status)) {
      query = query.where('status', '==', status);
    }

    // Add ordering and pagination
    query = query.orderBy('createdAt', 'desc').limit(limit).offset(offset);

    const snapshot = await query.get();
    const membershipPlans: MembershipPlan[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter by search term if provided
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = data.name?.toLowerCase().includes(searchLower);
        const descriptionMatch = data.description?.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !descriptionMatch) {
          return; // Skip this document
        }
      }

      membershipPlans.push({
        id: doc.id,
        ...data,
      } as MembershipPlan);
    });

    // Get total count for pagination
    const totalSnapshot = await adminDb.collection('membershipPlans').get();
    const total = totalSnapshot.size;

    return NextResponse.json({
      data: membershipPlans,
      total,
      hasMore: offset + limit < total,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch membership plans' },
      { status: 500 }
    );
  }
}

// POST - Create new membership plan
export async function POST(request: NextRequest): Promise<NextResponse> {
  const clientIP = getClientIP(request);

  try {
    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    // Validate API access
    const { session } = await validateAPIAccess(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can create membership plans
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input data
    const validation = validateMembershipPlanData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Add creator information
    const membershipPlanData = {
      ...validation.sanitizedData,
      createdBy: session.uid,
    };

    // Create the membership plan in Firestore
    const docRef = await adminDb.collection('membershipPlans').add(membershipPlanData);
    
    // Fetch the created document
    const createdDoc = await docRef.get();
    const createdPlan = {
      id: createdDoc.id,
      ...createdDoc.data(),
    } as MembershipPlan;

    return NextResponse.json(
      { 
        message: 'Membership plan created successfully',
        data: createdPlan
      },
      { status: 201 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create membership plan' },
      { status: 500 }
    );
  }
}