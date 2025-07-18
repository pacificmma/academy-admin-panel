// src/app/api/staff/route.ts - FIXED HTTP 500 ERROR
import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaffOrTrainer } from '@/app/lib/api/middleware';
import { errorResponse, successResponse } from '@/app/lib/api/response-utils';

// GET /api/staff - List all staff members
export const GET = requireStaffOrTrainer(async (request: NextRequest, context) => {
  try {
    const { session } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query - start with basic collection reference
    let query: any = adminDb.collection('staff');

    // Apply role filter - FIXED: Include visiting_trainer
    if (role && ['admin', 'trainer', 'visiting_trainer', 'staff'].includes(role)) {
      query = query.where('role', '==', role);
    }

    // Apply status filter
    if (status === 'active') {
      query = query.where('isActive', '==', true);
    } else if (status === 'inactive') {
      query = query.where('isActive', '==', false);
    }

    // Add ordering and limits
    query = query.orderBy('createdAt', 'desc').offset(offset).limit(limit);

    // Execute query with proper error handling
    const snapshot = await query.get();
    
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
        id: doc.id, // Use 'id' instead of 'uid' for consistency
        uid: doc.id, // Keep uid for backward compatibility
        fullName: data.fullName || '',
        email: data.email || '',
        role: data.role || 'staff',
        isActive: data.isActive ?? true,
        phoneNumber: data.phoneNumber || '',
        createdAt,
        lastLoginAt,
        // Only include non-sensitive fields
        emergencyContact: data.emergencyContact || null,
        address: data.address || null,
        notes: data.notes || '',
      };
    });

    // Apply search filtering on processed data
    if (search) {
      const searchLower = search.toLowerCase();
      staffMembers = staffMembers.filter((staff: any) =>
        (staff.fullName || '').toLowerCase().includes(searchLower) ||
        (staff.email || '').toLowerCase().includes(searchLower)
      );
    }

    return successResponse(staffMembers);

  } catch (error: any) {
    console.error('Staff API Error:', error);
    return errorResponse(
      error.message || 'Failed to load staff members', 
      500
    );
  }
});