// src/app/api/memberships/[id]/route.ts - CORRECTED with proper imports, week support, and TypeScript fixes
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { validateAPIAccess } from '@/app/lib/auth/session';
import { MembershipPlan } from '@/app/types/membership';
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

// Validation function for membership plan update data - UPDATED WITH WEEK SUPPORT
function validateUpdateMembershipPlanData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Invalid request body'] };
  }

  const { name, description, duration, price, classTypes, status, currency } = data;

  // Validate name (if provided)
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 3) {
      errors.push('Name must be at least 3 characters');
    } else if (name.trim().length > 100) {
      errors.push('Name must be less than 100 characters');
    }
  }

  // Validate description (if provided)
  if (description !== undefined && typeof description !== 'string') {
    errors.push('Description must be a string');
  } else if (description && description.trim().length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Validate duration (if provided) - updated with week options
  if (duration !== undefined) {
    const validDurations = ['1_week', '2_weeks', '3_weeks', '4_weeks', '1_month', '3_months', '6_months', '12_months', 'unlimited'];
    if (typeof duration !== 'string' || !validDurations.includes(duration)) {
      errors.push('Duration must be one of: 1_week, 2_weeks, 3_weeks, 4_weeks, 1_month, 3_months, 6_months, 12_months, unlimited');
    }
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      errors.push('Price must be a positive number');
    } else if (price > 10000) {
      errors.push('Price must be less than $10,000');
    }
  }

  if (classTypes !== undefined) {
    if (!Array.isArray(classTypes) || classTypes.length === 0) {
      errors.push('Class types must be a non-empty array');
    } else {
      const validClassTypes = ['bjj', 'mma', 'muay_thai', 'boxing', 'general_fitness', 'all'];
      for (const type of classTypes) {
        if (typeof type !== 'string' || !validClassTypes.includes(type)) {
          errors.push('Invalid class type: ' + type);
          break;
        }
      }
    }
  }

  if (status !== undefined) {
    const validStatuses = ['active', 'inactive', 'archived'];
    if (!validStatuses.includes(status)) {
      errors.push('Status must be one of: active, inactive, archived');
    }
  }

  if (currency !== undefined) {
    if (typeof currency !== 'string' || currency.trim().length === 0) {
      errors.push('Currency must be a non-empty string');
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Sanitize the data
  const sanitizedData: any = {};
  
  if (name !== undefined) sanitizedData.name = name.trim();
  if (description !== undefined) sanitizedData.description = description.trim();
  if (duration !== undefined) {
    sanitizedData.duration = duration.trim();
    
    // Convert duration to days (updated with week options)
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
    sanitizedData.durationInDays = durationToDays[duration] || 30;
  }
  if (price !== undefined) sanitizedData.price = Math.round(price * 100) / 100;
  if (currency !== undefined) sanitizedData.currency = currency.trim();
  if (classTypes !== undefined) sanitizedData.classTypes = classTypes.map((type: string) => type.trim());
  if (status !== undefined) sanitizedData.status = status;
  
  // Always update the updatedAt timestamp
  sanitizedData.updatedAt = new Date().toISOString();

  return { isValid: true, errors: [], sanitizedData };
}

// ============================================
// API ENDPOINTS
// ============================================

// GET - Fetch specific membership plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    // Fetch the membership plan
    const doc = await adminDb.collection('membershipPlans').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    const membershipPlan: MembershipPlan = {
      id: doc.id,
      ...doc.data(),
    } as MembershipPlan;

    return NextResponse.json({ data: membershipPlan });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch membership plan' },
      { status: 500 }
    );
  }
}

// PUT - Update membership plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    // Only admins can update membership plans
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if membership plan exists
    const existingDoc = await adminDb.collection('membershipPlans').doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input data
    const validation = validateUpdateMembershipPlanData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Update the membership plan
    await adminDb.collection('membershipPlans').doc(id).update(validation.sanitizedData);
    
    // Fetch the updated document
    const updatedDoc = await adminDb.collection('membershipPlans').doc(id).get();
    const updatedPlan: MembershipPlan = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    } as MembershipPlan;

    return NextResponse.json({
      message: 'Membership plan updated successfully',
      data: updatedPlan
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update membership plan' },
      { status: 500 }
    );
  }
}

// DELETE - Delete membership plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    // Only admins can delete membership plans
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Check if membership plan exists
    const existingDoc = await adminDb.collection('membershipPlans').doc(id).get();
    if (!existingDoc.exists) {
      return NextResponse.json(
        { error: 'Membership plan not found' },
        { status: 404 }
      );
    }

    // Check if the plan is being used by any active memberships
    const activeMemberships = await adminDb.collection('memberMemberships')
      .where('membershipPlanId', '==', id)
      .where('isActive', '==', true)
      .get();

    if (!activeMemberships.empty) {
      return NextResponse.json(
        { error: 'Cannot delete membership plan that is currently in use by active members' },
        { status: 409 }
      );
    }

    // Delete the membership plan
    await adminDb.collection('membershipPlans').doc(id).delete();

    return NextResponse.json({
      message: 'Membership plan deleted successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete membership plan' },
      { status: 500 }
    );
  }
}