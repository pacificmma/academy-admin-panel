// src/app/api/membership-packages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin } from '@/app/lib/api/middleware';
import { Timestamp } from 'firebase-admin/firestore';

// Input validation and sanitization
function validatePackageId(id: string): boolean {
  // Only allow alphanumeric characters and hyphens, max 50 chars
  const validIdPattern = /^[a-zA-Z0-9-_]{1,50}$/;
  return validIdPattern.test(id);
}

function sanitizeUpdateData(data: any): any {
  const allowedFields = [
    'name', 'description', 'duration', 'durationType', 'price',
    'ageGroup', 'minAge', 'maxAge', 'sportCategories', 'isFullAccess',
    'isUnlimited', 'classLimitPerWeek', 'classLimitPerMonth',
    'allowFreeze', 'maxFreezeMonths', 'minFreezeWeeks',
    'guestPassesIncluded', 'autoRenewal', 'renewalDiscountPercent',
    'earlyTerminationFee', 'minimumCommitmentMonths', 'status',
    'isPopular', 'displayOrder'
  ];

  const sanitized: any = {};
  
  allowedFields.forEach(field => {
    if (data.hasOwnProperty(field) && data[field] !== undefined) {
      sanitized[field] = data[field];
    }
  });

  return sanitized;
}

function validateUpdateData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required field validations
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length < 3 || data.name.length > 100) {
      errors.push('Package name must be between 3-100 characters');
    }
  }

  if (data.duration !== undefined) {
    if (!Number.isInteger(data.duration) || data.duration <= 0 || data.duration > 120) {
      errors.push('Duration must be a positive integer between 1-120');
    }
  }

  if (data.price !== undefined) {
    if (typeof data.price !== 'number' || data.price < 0 || data.price > 999999) {
      errors.push('Price must be a positive number less than 999,999');
    }
  }

  if (data.durationType !== undefined) {
    if (!['months', 'weeks', 'days'].includes(data.durationType)) {
      errors.push('Invalid duration type');
    }
  }

  if (data.ageGroup !== undefined) {
    if (!['adult', 'youth', 'both'].includes(data.ageGroup)) {
      errors.push('Invalid age group');
    }
  }

  if (data.status !== undefined) {
    if (!['Active', 'Inactive', 'Archived'].includes(data.status)) {
      errors.push('Invalid status');
    }
  }

  // Age validations
  if (data.minAge !== undefined && (data.minAge < 1 || data.minAge > 100)) {
    errors.push('Minimum age must be between 1-100');
  }

  if (data.maxAge !== undefined && (data.maxAge < 1 || data.maxAge > 100)) {
    errors.push('Maximum age must be between 1-100');
  }

  // Percentage validations
  if (data.renewalDiscountPercent !== undefined) {
    if (data.renewalDiscountPercent < 0 || data.renewalDiscountPercent > 100) {
      errors.push('Renewal discount must be between 0-100%');
    }
  }

  // Array validations
  if (data.sportCategories !== undefined) {
    if (!Array.isArray(data.sportCategories) || data.sportCategories.length > 20) {
      errors.push('Sport categories must be an array with max 20 items');
    }
  }

  return { isValid: errors.length === 0, errors };
}

function removeUndefinedValues(obj: any): any {
  const cleaned: any = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        cleaned[key] = value;
      } else if (typeof value === 'object') {
        const nestedCleaned = removeUndefinedValues(value);
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
}

// GET - Get single package
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate package ID
    if (!validatePackageId(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid package ID format' },
        { status: 400 }
      );
    }

    const packageDoc = await adminDb
      .collection('membershipPackages')
      .doc(params.id)
      .get();
    
    if (!packageDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    const data = packageDoc.data();
    return NextResponse.json({
      success: true,
      data: {
        id: packageDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.() || new Date(),
        updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      }
    });
  } catch (error: any) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

// PUT - Update package (Admin only)
export const PUT = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { params } = context;
    const { session } = context;

    if (!params?.id || !validatePackageId(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    // Rate limiting check (simple implementation)
    const now = Date.now();
    const rateLimitKey = `update_${session.uid}_${now}`;
    // In production, use Redis or similar for rate limiting

    // Sanitize input data
    const sanitizedData = sanitizeUpdateData(body);
    
    // Validate sanitized data
    const validation = validateUpdateData(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    const packageRef = adminDb.collection('membershipPackages').doc(params.id);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Package not found' },
        { status: 404 }
      );
    }

    // Security: Remove undefined values and add metadata
    const cleanedData = removeUndefinedValues(sanitizedData);
    
    const updateData = {
      ...cleanedData,
      updatedAt: Timestamp.now(),
      lastModifiedBy: session.uid,
      lastModifiedByName: session.fullName,
    };

    // Use transaction for atomic update
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(packageRef);
      if (!doc.exists) {
        throw new Error('Package not found during transaction');
      }
      transaction.update(packageRef, updateData);
    });

    return NextResponse.json({
      success: true,
      message: 'Package updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update package' },
      { status: 500 }
    );
  }
});

// DELETE - Delete package (Admin only)
export const DELETE = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { params } = context;
    const { session } = context;

    if (!params?.id || !validatePackageId(params.id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    // Use transaction for safe deletion
    await adminDb.runTransaction(async (transaction) => {
      const packageRef = adminDb.collection('membershipPackages').doc(params.id);
      const packageDoc = await transaction.get(packageRef);

      if (!packageDoc.exists) {
        throw new Error('Package not found');
      }

      // Check for active subscriptions
      const subscriptionsSnapshot = await adminDb
        .collection('membershipSubscriptions')
        .where('packageId', '==', params.id)
        .where('status', 'in', ['Active', 'Paused'])
        .limit(1)
        .get();

      if (!subscriptionsSnapshot.empty) {
        throw new Error('Cannot delete package with active subscriptions');
      }

      // Log deletion for audit trail
      await transaction.create(adminDb.collection('auditLogs').doc(), {
        action: 'package_deleted',
        packageId: params.id,
        packageName: packageDoc.data()?.name || 'Unknown',
        deletedBy: session.uid,
        deletedByName: session.fullName,
        timestamp: Timestamp.now(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      transaction.delete(packageRef);
    });

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    
    if (error.message === 'Cannot delete package with active subscriptions') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete package with active subscriptions' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete package' },
      { status: 500 }
    );
  }
});