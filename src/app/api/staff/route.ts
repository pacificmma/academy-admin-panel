// src/app/api/staff/route.ts - Staff List API (Modified)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { errorResponse, successResponse } from '@/app/lib/api/response-utils';
import { withSecurity } from '@/app/lib/security/api-security';
import { PERMISSIONS } from '@/app/lib/api/permissions';
import { UserRole } from '@/app/types/auth';

// GET /api/staff - List all staff members
export async function GET(request: NextRequest) {
  try {
    // Apply security checks - allow admin, trainer, and staff to list staff for basic info (e.g., instructors for classes)
    const { session, error } = await withSecurity(request, {
      requiredRoles: PERMISSIONS.staff.viewBasicInfo, // MODIFIED: Allow staff and trainers to view basic info
      rateLimit: { maxRequests: 100, windowMs: 15 * 60 * 1000 }
    });

    if (error) return error;

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
      let staffMembers = snapshot.docs.map((doc: { data: () => any; id: any; }) => {
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
        staffMembers = staffMembers.filter((staff: { fullName: string; email: string; }) =>
          staff.fullName.toLowerCase().includes(searchLower) ||
          staff.email.toLowerCase().includes(searchLower)
        );
      }

      return successResponse(staffMembers);
    } catch (dbError: any) {
      console.error('Database query error for staff:', dbError);
      throw new Error('Failed to fetch staff members from database');
    }

  } catch (error: any) {
    return errorResponse(error.message || 'Failed to list staff members', 500);
  }
}