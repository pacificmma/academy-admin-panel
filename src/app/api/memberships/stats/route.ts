//src/app/api/memberships/stats/route.ts - FIXED VERSION
// ============================================

import { NextRequest } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin';
import { requireStaffOrTrainer } from '@/app/lib/api/middleware';
import { errorResponse, successResponse } from '@/app/lib/api/response-utils';

// GET /api/memberships/stats - Get membership statistics
export const GET = requireStaffOrTrainer(async (request: NextRequest, context) => {
  try {
    const { session } = context;

    // Get all membership plans
    const membershipPlansSnapshot = await adminDb.collection('membershipPlans').get();
    
    const totalPlans = membershipPlansSnapshot.size;
    let activePlans = 0;

    // Count active plans
    membershipPlansSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active') {
        activePlans++;
      }
    });

    const stats = {
      totalPlans,
      activePlans,
      inactivePlans: totalPlans - activePlans,
      lastUpdated: new Date().toISOString()
    };

    return successResponse(stats);

  } catch (error) {
    return errorResponse('Failed to load membership statistics', 500);
  }
});