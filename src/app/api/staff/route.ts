// src/app/api/staff/route.ts - INDEX FIX VERSION
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaffOrTrainer, requireAdmin } from '@/app/lib/api/middleware';
import { errorResponse, successResponse, createdResponse, badRequestResponse } from '@/app/lib/api/response-utils';
import { adminAuth } from '@/app/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET /api/staff - List all staff members (INDEX SAFE VERSION)
export const GET = requireStaffOrTrainer(async (request: NextRequest, context) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    console.log(`[Staff API] Request from ${session.email} (${session.role})`);
    console.log(`[Staff API] Filters - search: ${search}, role: ${role}, status: ${status}`);

    // Build query with fallback for missing indexes
    let query: any = adminDb.collection('staff');
    let useSimpleQuery = false;

    try {
      // Try compound query first
      if (role && ['admin', 'trainer', 'visiting_trainer'].includes(role)) {
        query = query.where('role', '==', role);
      }

      if (status === 'active') {
        query = query.where('isActive', '==', true);
      } else if (status === 'inactive') {
        query = query.where('isActive', '==', false);
      }

      // Try to add ordering - this might fail if index doesn't exist
      if (!role && !status) {
        // Simple query without filters - safer for ordering
        query = query.orderBy('createdAt', 'desc').limit(limit);
      } else {
        // With filters - more likely to need custom index
        query = query.limit(limit);
      }

    } catch (indexError) {
      console.warn('[Staff API] Index error, falling back to simple query:', indexError);
      useSimpleQuery = true;
    }

    // Fallback to simple query if compound query fails
    if (useSimpleQuery) {
      query = adminDb.collection('staff').limit(limit);
    }

    console.log('[Staff API] Executing query...');
    const snapshot = await query.get();
    console.log(`[Staff API] Query returned ${snapshot.size} documents`);
    
    let staffMembers = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      
      // Safe timestamp conversion
      let createdAt: string;
      let lastLoginAt: string | null = null;
      
      try {
        createdAt = data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString();
      } catch {
        createdAt = new Date().toISOString();
      }
      
      try {
        lastLoginAt = data.lastLoginAt?.toDate?.()?.toISOString() || null;
      } catch {
        lastLoginAt = null;
      }

      return {
        id: doc.id,
        uid: doc.id,
        fullName: data.fullName || '',
        email: data.email || '',
        role: data.role || 'trainer',
        isActive: data.isActive ?? true,
        phoneNumber: data.phoneNumber || '',
        createdAt,
        lastLoginAt,
        emergencyContact: data.emergencyContact || null,
        address: data.address || null,
        notes: data.notes || '',
        specializations: data.specializations || [],
      };
    });

    // Apply client-side filtering if we used simple query
    if (useSimpleQuery || role || status) {
      // Filter out invalid roles
      staffMembers = staffMembers.filter((staff: any) => 
        ['admin', 'trainer', 'visiting_trainer'].includes(staff.role)
      );

      // Apply role filter if specified
      if (role && ['admin', 'trainer', 'visiting_trainer'].includes(role)) {
        staffMembers = staffMembers.filter((staff: any) => staff.role === role);
      }

      // Apply status filter if specified
      if (status === 'active') {
        staffMembers = staffMembers.filter((staff: any) => staff.isActive === true);
      } else if (status === 'inactive') {
        staffMembers = staffMembers.filter((staff: any) => staff.isActive === false);
      }

      // Sort by creation date (newest first)
      staffMembers.sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Apply pagination
      staffMembers = staffMembers.slice(offset, offset + limit);
    }

    // Apply search filtering on processed data
    if (search) {
      const searchLower = search.toLowerCase();
      staffMembers = staffMembers.filter((staff: any) =>
        (staff.fullName || '').toLowerCase().includes(searchLower) ||
        (staff.email || '').toLowerCase().includes(searchLower) ||
        (staff.role || '').toLowerCase().includes(searchLower)
      );
    }

    console.log(`[Staff API] Returning ${staffMembers.length} staff members after filtering`);
    return successResponse(staffMembers);

  } catch (error: any) {
    // Enhanced error logging for debugging
    console.error('[Staff API] Error Details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Handle specific Firestore errors
    if (error.code === 9 || error.message?.includes('requires an index')) {
      console.error('[Staff API] Index missing - using fallback query');
      
      try {
        // Emergency fallback - get all staff and filter client-side
        const simpleSnapshot = await adminDb.collection('staff').limit(100).get();
        
        let fallbackStaff = simpleSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: doc.id,
            uid: doc.id,
            fullName: data.fullName || '',
            email: data.email || '',
            role: data.role || 'trainer',
            isActive: data.isActive ?? true,
            phoneNumber: data.phoneNumber || '',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null,
            emergencyContact: data.emergencyContact || null,
            address: data.address || null,
            notes: data.notes || '',
            specializations: data.specializations || [],
          };
        });

        // Filter for valid roles and active status
        fallbackStaff = fallbackStaff.filter((staff: any) => 
          ['admin', 'trainer', 'visiting_trainer'].includes(staff.role) &&
          staff.isActive === true
        );

        console.log(`[Staff API] Fallback query returned ${fallbackStaff.length} staff members`);
        return successResponse(fallbackStaff);
        
      } catch (fallbackError) {
        console.error('[Staff API] Fallback query also failed:', fallbackError);
        return errorResponse('Database index missing. Please create the required index or contact administrator.', 500);
      }
    }
    
    return errorResponse(
      error.message || 'Failed to load staff members', 
      500
    );
  }
});

// POST method remains the same
export const POST = requireAdmin(async (request: NextRequest, context) => {
  try {
    const { session } = context;
    const body = await request.json();

    const { email, fullName, phoneNumber, password, role } = body;

    if (!email || !fullName || !password || !role) {
      return badRequestResponse('Missing required fields: email, fullName, password, role');
    }

    if (!['admin', 'trainer', 'visiting_trainer'].includes(role)) {
      return badRequestResponse('Invalid role specified. Valid roles: admin, trainer, visiting_trainer');
    }

    const existingStaff = await adminDb.collection('staff')
      .where('email', '==', email.toLowerCase())
      .get();

    if (!existingStaff.empty) {
      return badRequestResponse('Email already exists');
    }

    try {
      const firebaseUser = await adminAuth.createUser({
        email: email.toLowerCase(),
        password: password,
        displayName: fullName,
        phoneNumber: phoneNumber || undefined,
      });

      const staffData = {
        email: email.toLowerCase(),
        fullName: fullName.trim(),
        phoneNumber: phoneNumber || '',
        role: role,
        isActive: true,
        specializations: body.specializations || [],
        emergencyContact: body.emergencyContact || null,
        address: body.address || null,
        notes: body.notes || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: session.uid,
      };

      await adminDb.collection('staff').doc(firebaseUser.uid).set(staffData);

      await adminAuth.setCustomUserClaims(firebaseUser.uid, {
        role: role,
        isStaff: true,
        createdBy: session.uid
      });

      const responseData = {
        id: firebaseUser.uid,
        uid: firebaseUser.uid,
        email: email.toLowerCase(),
        fullName: fullName.trim(),
        phoneNumber: phoneNumber || '',
        role: role,
        isActive: true,
        specializations: body.specializations || [],
        emergencyContact: body.emergencyContact || null,
        address: body.address || null,
        notes: body.notes || '',
        createdAt: new Date().toISOString(),
      };

      return createdResponse(responseData, 'Staff member created successfully');

    } catch (firebaseError: any) {
      if (firebaseError.code !== 'auth/user-not-found') {
        try {
          const existingUser = await adminAuth.getUserByEmail(email);
          await adminAuth.deleteUser(existingUser.uid);
        } catch (cleanupError) {
          console.error('Failed to cleanup Firebase user after error:', cleanupError);
        }
      }
      
      throw new Error(`Failed to create staff member: ${firebaseError.message}`);
    }

  } catch (error: any) {
    console.error('Staff creation error:', error);
    return errorResponse(error.message || 'Failed to create staff member', 500);
  }
});