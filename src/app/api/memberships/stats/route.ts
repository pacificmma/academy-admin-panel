// src/app/api/memberships/stats/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/app/lib/firebase/admin'; // ✅ Admin SDK kullan
import { getSession } from '@/app/lib/auth/session';
import { MembershipStats } from '@/app/types/membership';
import { ApiResponse } from '@/app/types/api';

// GET /api/memberships/stats - Get membership statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Admin SDK ile query
    const snapshot = await adminDb.collection('membershipPlans').get();
    
    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate basic stats only (cleaned version)
    const totalPlans = snapshot.size; // Daha performanslı
    const activePlans = snapshot.docs.filter(doc => 
      doc.data().status === 'active'
    ).length;

    const stats: MembershipStats = {
      totalPlans,
      activePlans,
    };

    const response: ApiResponse<MembershipStats> = {
      success: true,
      data: stats,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Stats API Error:', error); // Debug için
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch membership statistics' },
      { status: 500 }
    );
  }
}