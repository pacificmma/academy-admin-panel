// src/app/types/membership.ts - CLEANED VERSION (Removed placeholder properties)
// ============================================

export type DurationType = 'days' | 'weeks' | 'months' | 'years';
export type MembershipStatus = 'active' | 'inactive' | 'draft';

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  durationValue: number; // 1, 2, 3, 6, 12 etc.
  durationType: DurationType;
  price: number;
  currency: string;
  classTypes: string[];
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface MembershipPlanFormData {
  name: string;
  description?: string;
  durationValue: number;
  durationType: DurationType;
  price: number;
  currency: string;
  classTypes: string[];
  status: MembershipStatus;
}

export interface MembershipPlanFilters {
  type?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  duration?: string;
  searchTerm?: string;
}

export interface MembershipStats {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
}

export interface MemberMembership {
  id: string;
  memberId: string;
  membershipPlanId: string;
  startDate: string; // ISO 8601 string
  endDate: string; // ISO 8601 string
  status: 'active' | 'pending' | 'suspended' | 'cancelled' | 'expired';
  paymentReference?: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  amount: number;
  currency: string;
  classesUsed: number;
  maxClasses?: number;
  isUnlimited: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberMembershipFilters {
  memberId?: string;
  membershipPlanId?: string;
  status?: 'active' | 'pending' | 'suspended' | 'cancelled' | 'expired';
  paymentStatus?: 'paid' | 'pending' | 'failed';
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  searchTerm?: string;
}

// Utility function
export function formatDuration(value: number, type: DurationType): string {
  const unit = value === 1 ? type.slice(0, -1) : type;
  return `${value} ${unit}`;
}