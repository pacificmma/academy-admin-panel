// src/app/api/staff/create/route.ts - Secure Staff Creation with Firebase Auth - FIXED
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { successResponse, errorResponse, conflictResponse, createdResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Validation schema for creating staff
const createStaffSchema = z.object({
  email: z.string().email('Invalid email format').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phoneNumber: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid phone number format'),
  role: z.enum(['admin', 'trainer', 'staff'], { required_error: 'Role is required' }),
  emergencyContact: z.object({
    name: z.string().min(2).max(100),
    phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,20}$/, 'Invalid emergency contact phone format'),
    relationship: z.string().min(2).max(50)
  }).optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional(),
    country: z.string().max(100).optional()
  }).optional(),
  specializations: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  notes: z.string().max(500).optional()
});

type CreateStaffInput = z.infer<typeof createStaffSchema>;

// POST /api/staff/create - Create new staff member
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;

    // Parse and validate request body
    let body: CreateStaffInput;
    try {
      const rawBody = await request.json();
      body = createStaffSchema.parse(rawBody);
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        return badRequestResponse(parseError.errors[0].message);
      }
      return badRequestResponse('Invalid JSON format');
    }

    const { email, password, fullName, phoneNumber, role, ...otherData } = body;

    try {
      // Check if email already exists in Firebase Auth
      try {
        await adminAuth.getUserByEmail(email);
        return conflictResponse('Email already exists in the system');
      } catch (firebaseError: any) {
        // If user doesn't exist, that's what we want
        if (firebaseError.code !== 'auth/user-not-found') {
          throw new Error('Failed to check email availability');
        }
      }

      // Check if email exists in our staff collection
      const existingStaff = await adminDb.collection('staff')
        .where('email', '==', email)
        .get();

      if (!existingStaff.empty) {
        return conflictResponse('Email already exists in staff records');
      }

      // Create Firebase Authentication user
      const firebaseUser = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: fullName,
        emailVerified: true, // Admin-created accounts are considered verified
        disabled: false
      });

      // Hash password for our database (additional security layer)
      const hashedPassword = await bcrypt.hash(password, 12);

      // Prepare staff document data
      const staffData = {
        uid: firebaseUser.uid, // Link to Firebase Auth UID
        email: email,
        fullName: fullName,
        phoneNumber: phoneNumber,
        role: role,
        isActive: true,
        password: hashedPassword, // Store hashed password as backup
        createdBy: session.uid,
        createdAt: new Date(),
        updatedBy: session.uid,
        updatedAt: new Date(),
        lastLoginAt: null,
        lastLoginIP: null,
        lastLoginUserAgent: null,
        failedLoginAttempts: 0,
        accountLockoutUntil: null,
        ...otherData
      };

      // Create staff document in Firestore using Firebase UID as document ID
      await adminDb.collection('staff').doc(firebaseUser.uid).set(staffData);

      // Set custom claims for role-based access
      await adminAuth.setCustomUserClaims(firebaseUser.uid, {
        role: role,
        isStaff: true,
        createdBy: session.uid
      });

      // Prepare response data (exclude sensitive information)
      const responseData = {
        uid: firebaseUser.uid,
        email: email,
        fullName: fullName,
        phoneNumber: phoneNumber,
        role: role,
        isActive: true,
        createdAt: staffData.createdAt.toISOString(),
        emergencyContact: otherData.emergencyContact,
        specializations: otherData.specializations,
        certifications: otherData.certifications
      };

      return createdResponse(responseData, 'Staff member created successfully');

    } catch (firebaseError: any) {
      // If Firebase user was created but Firestore failed, clean up
      if (firebaseError.code !== 'auth/user-not-found') {
        try {
          const existingUser = await adminAuth.getUserByEmail(email);
          await adminAuth.deleteUser(existingUser.uid);
        } catch (cleanupError) {
          // Log cleanup error but don't throw
          console.error('Failed to cleanup Firebase user after error:', cleanupError);
        }
      }
      
      throw new Error(`Failed to create staff member: ${firebaseError.message}`);
    }

  } catch (error: any) {
    console.error('Staff creation error:', error);
    return errorResponse('Failed to create staff member', 500);
  }
});

// Handle OPTIONS for CORS - FIXED FOR NEXT.JS 15
export async function OPTIONS() {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}