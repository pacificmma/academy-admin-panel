//src/app/api/staff/route.ts - FIXED VERSION
// ============================================

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

    try {
      // Build query
      let query: any = adminDb.collection('staff').orderBy('createdAt', 'desc');

      // Apply filters
      if (role && ['admin', 'trainer', 'staff'].includes(role)) {
        query = query.where('role', '==', role);
      }

      if (status === 'active') {
        query = query.where('isActive', '==', true);
      } else if (status === 'inactive') {
        query = query.where('isActive', '==', false);
      }

      const snapshot = await query.offset(offset).limit(limit).get();
      let staffMembers = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLoginAt: data.lastLoginAt?.toDate?.()?.toISOString() || null,
        };
      });

      // Apply search filtering
      if (search) {
        const searchLower = search.toLowerCase();
        staffMembers = staffMembers.filter((staff: any) =>
          staff.fullName.toLowerCase().includes(searchLower) ||
          staff.email.toLowerCase().includes(searchLower)
        );
      }

      return successResponse(staffMembers);
    } catch (dbError: any) {
      throw new Error('Failed to fetch staff members from database');
    }

  } catch (error: any) {
    return errorResponse(error.message || 'Failed to list staff members', 500);
  }
});