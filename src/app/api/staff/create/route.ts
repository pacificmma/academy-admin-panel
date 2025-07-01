// src/app/api/staff/create/route.ts - Secure Staff Creation with Firebase Auth
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { withSecurity, handleError, sanitizeOutput } from '@/app/lib/security/api-security';
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
export async function POST(request: NextRequest) {
  try {
    // Apply security checks - only admins can create staff
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
      rateLimit: { maxRequests: 10, windowMs: 15 * 60 * 1000 } // Stricter rate limit for creation
    });

    if (error) return error;

    // Parse and validate request body
    let body: CreateStaffInput;
    try {
      const rawBody = await request.json();
      body = createStaffSchema.parse(rawBody);
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: parseError.errors[0].message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    const { email, password, fullName, phoneNumber, role, ...otherData } = body;

    try {
      // Check if email already exists in Firebase Auth
      try {
        await adminAuth.getUserByEmail(email);
        return NextResponse.json(
          { success: false, error: 'Email already exists in the system' },
          { status: 409 }
        );
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
        return NextResponse.json(
          { success: false, error: 'Email already exists in staff records' },
          { status: 409 }
        );
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
        createdBy: session!.uid,
        createdAt: new Date(),
        updatedBy: session!.uid,
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
        createdBy: session!.uid
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

      return NextResponse.json({
        success: true,
        message: 'Staff member created successfully',
        data: responseData
      }, { status: 201 });

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
    return handleError(error);
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://yourdomain.com'
        : 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}