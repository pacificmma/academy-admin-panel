// src/app/api/membership-packages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin } from '@/app/lib/api/middleware';
import { Timestamp } from 'firebase-admin/firestore';

// Enhanced input validation
function validatePackageInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Package name is required and must be a string');
  } else {
    const trimmedName = data.name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.push('Package name must be between 3-100 characters');
    }
    // Check for potentially malicious content
    if (/<script|javascript:|data:/i.test(trimmedName)) {
      errors.push('Package name contains invalid content');
    }
  }
  
  if (!data.duration || !Number.isInteger(data.duration) || data.duration <= 0 || data.duration > 120) {
    errors.push('Duration must be a positive integer between 1-120');
  }
  
  if (data.price === undefined || data.price === null || typeof data.price !== 'number' || data.price < 0 || data.price > 999999) {
    errors.push('Price must be a non-negative number less than 999,999');
  }
  
  if (!['months', 'weeks', 'days'].includes(data.durationType)) {
    errors.push('Invalid duration type. Must be: months, weeks, or days');
  }
  
  if (!['adult', 'youth', 'both'].includes(data.ageGroup)) {
    errors.push('Invalid age group. Must be: adult, youth, or both');
  }

  if (!['Active', 'Inactive', 'Archived'].includes(data.status)) {
    errors.push('Invalid status. Must be: Active, Inactive, or Archived');
  }
  
  // Sport categories validation
  if (!data.isFullAccess) {
    if (!Array.isArray(data.sportCategories) || data.sportCategories.length === 0) {
      errors.push('Sport categories are required when full access is disabled');
    } else if (data.sportCategories.length > 20) {
      errors.push('Maximum 20 sport categories allowed');
    }
    
    // Validate each category ID
    data.sportCategories.forEach((catId: any, index: number) => {
      if (typeof catId !== 'string' || catId.length === 0 || catId.length > 50) {
        errors.push(`Invalid sport category at index ${index}`);
      }
    });
  }

  // Usage limits validation
  if (!data.isUnlimited) {
    const hasWeeklyLimit = data.classLimitPerWeek && data.classLimitPerWeek > 0;
    const hasMonthlyLimit = data.classLimitPerMonth && data.classLimitPerMonth > 0;
    
    if (!hasWeeklyLimit && !hasMonthlyLimit) {
      errors.push('Either weekly or monthly class limit must be specified for limited packages');
    }
    
    if (data.classLimitPerWeek && (data.classLimitPerWeek < 1 || data.classLimitPerWeek > 50)) {
      errors.push('Weekly class limit must be between 1-50');
    }
    
    if (data.classLimitPerMonth && (data.classLimitPerMonth < 1 || data.classLimitPerMonth > 200)) {
      errors.push('Monthly class limit must be between 1-200');
    }
  }

  // Age restrictions validation
  if (data.ageGroup === 'youth') {
    if (data.maxAge && data.maxAge > 17) {
      errors.push('Youth packages cannot have maximum age above 17');
    }
    if (data.minAge && data.minAge < 4) {
      errors.push('Youth packages cannot have minimum age below 4');
    }
  }

  if (data.ageGroup === 'adult') {
    if (data.minAge && data.minAge < 18) {
      errors.push('Adult packages cannot have minimum age below 18');
    }
  }

  // Optional field validations
  if (data.renewalDiscountPercent !== undefined) {
    if (typeof data.renewalDiscountPercent !== 'number' || data.renewalDiscountPercent < 0 || data.renewalDiscountPercent > 100) {
      errors.push('Renewal discount must be between 0-100%');
    }
  }

  if (data.guestPassesIncluded !== undefined) {
    if (!Number.isInteger(data.guestPassesIncluded) || data.guestPassesIncluded < 0 || data.guestPassesIncluded > 50) {
      errors.push('Guest passes must be between 0-50');
    }
  }

  if (data.displayOrder !== undefined) {
    if (!Number.isInteger(data.displayOrder) || data.displayOrder < 1 || data.displayOrder > 9999) {
      errors.push('Display order must be between 1-9999');
    }
  }

  if (data.description && data.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }
  
  return { isValid: errors.length === 0, errors };
}

function sanitizePackageData(data: any): any {
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
    if (data.hasOwnProperty(field)) {
      let value = data[field];
      
      // Sanitize string fields
      if (typeof value === 'string') {
        value = value.trim();
        // Remove potentially dangerous characters but preserve normal text
        value = value.replace(/<script.*?>.*?<\/script>/gi, '');
        value = value.replace(/javascript:/gi, '');
        value = value.replace(/data:/gi, '');
      }
      
      if (value !== undefined && value !== null && value !== '') {
        sanitized[field] = value;
      }
    }
  });

  return sanitized;
}

function removeUndefinedValues(obj: any): any {
  const cleaned: any = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        cleaned[key] = value.filter(item => item !== undefined && item !== null);
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

// GET - Get all packages (Admin only)
export const GET = requireAdmin(async (request: NextRequest, context) => {
  try {
    // Parse query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const ageGroup = url.searchParams.get('ageGroup');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 100); // Max 100 items

    let query = adminDb.collection('membershipPackages');

    // Apply filters securely
    if (status && ['Active', 'Inactive', 'Archived'].includes(status)) {
      query = query.where('status', '==', status);
    }

    if (ageGroup && ['adult', 'youth', 'both'].includes(ageGroup)) {
      query = query.where('ageGroup', '==', ageGroup);
    }

    const snapshot = await query
      .orderBy('displayOrder', 'asc')
      .limit(limit)
      .get();
    
    const packages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));

    return NextResponse.json({
      success: true,
      data: packages,
      count: packages.length
    });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
});

// POST - Create new package (Admin only)
export const POST = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { session } = context;

    // Rate limiting check (basic implementation)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    // In production, implement proper rate limiting with Redis

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

    // Sanitize input data
    const sanitizedData = sanitizePackageData(body);

    // Validate sanitized data
    const validation = validatePackageInput(sanitizedData);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    // Check for duplicate package names
    const existingPackage = await adminDb
      .collection('membershipPackages')
      .where('name', '==', sanitizedData.name.trim())
      .limit(1)
      .get();

    if (!existingPackage.empty) {
      return NextResponse.json(
        { success: false, error: 'Package with this name already exists' },
        { status: 409 }
      );
    }

    // Security: Remove undefined values and add metadata
    const cleanedData = removeUndefinedValues(sanitizedData);
    
    const packageData = {
      ...cleanedData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: session.uid,
      createdByName: session.fullName,
    };

    // Use transaction for atomic operation
    const docRef = await adminDb.runTransaction(async (transaction) => {
      const newDocRef = adminDb.collection('membershipPackages').doc();
      
      // Create audit log
      const auditLogRef = adminDb.collection('auditLogs').doc();
      transaction.create(auditLogRef, {
        action: 'package_created',
        packageId: newDocRef.id,
        packageName: packageData.name,
        createdBy: session.uid,
        createdByName: session.fullName,
        timestamp: Timestamp.now(),
        ip: clientIP
      });

      transaction.create(newDocRef, packageData);
      return newDocRef;
    });

    return NextResponse.json({
      success: true,
      data: { 
        id: docRef.id, 
        ...packageData,
        createdAt: packageData.createdAt.toDate(),
        updatedAt: packageData.updatedAt.toDate()
      },
      message: 'Package created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create package' },
      { status: 500 }
    );
  }
});