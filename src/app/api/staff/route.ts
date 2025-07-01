// src/app/api/staff/route.ts - Staff List API (Updated)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { withSecurity, handleError, sanitizeOutput } from '@/app/lib/security/api-security';

// GET /api/staff - List all staff members
export async function GET(request: NextRequest) {
  try {
    // Apply security checks - only admins can list all staff
    const { session, error } = await withSecurity(request, {
      requiredRoles: ['admin'],
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
      let query = adminDb.collection('staff').orderBy('createdAt', 'desc');

      // Apply filters
      if (role && ['admin', 'trainer', 'staff'].includes(role)) {
        query = query.where('role', '==', role);
      }

      if (status) {
        const isActive = status === 'active';
        query = query.where('isActive', '==', isActive);
      }

      // Execute query
      const snapshot = await query.limit(limit + 1).get(); // +1 to check if there are more results

      let staffList: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        staffList.push({
          uid: doc.id,
          email: data.email,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          role: data.role,
          isActive: data.isActive,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          lastLoginAt: data.lastLoginAt,
          emergencyContact: data.emergencyContact,
          specializations: data.specializations || [],
          certifications: data.certifications || [],
          // Exclude sensitive fields
        });
      });

      // Apply search filter (client-side for simplicity)
      if (search) {
        const searchTerm = search.toLowerCase();
        staffList = staffList.filter(staff =>
          staff.fullName.toLowerCase().includes(searchTerm) ||
          staff.email.toLowerCase().includes(searchTerm) ||
          staff.role.toLowerCase().includes(searchTerm)
        );
      }

      // Apply pagination
      const hasMore = staffList.length > limit;
      if (hasMore) {
        staffList = staffList.slice(0, limit);
      }

      const paginatedList = staffList.slice(offset, offset + limit);

      return NextResponse.json({
        success: true,
        data: paginatedList,
        pagination: {
          total: staffList.length,
          limit,
          offset,
          hasMore: hasMore && (offset + limit < staffList.length)
        }
      });

    } catch (dbError: any) {
      throw new Error('Failed to fetch staff members');
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}