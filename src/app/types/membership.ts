// src/app/types/membership.ts - Clean and Simple Types
export type DurationType = 'days' | 'weeks' | 'months' | 'years';
export type MembershipStatus = 'active' | 'inactive' | 'draft';

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  durationValue: number; // 1, 2, 3, 6, 12 vb.
  durationType: DurationType; // 'days', 'weeks', 'months', 'years'
  price: number;
  currency: string;
  classTypes: string[]; // Esnek class types
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
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

// --- Added interfaces to fix TypeScript errors in other files ---
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

// Utility functions
export function formatDuration(value: number, type: DurationType): string {
  const unit = value === 1 ? type.slice(0, -1) : type; // Remove 's' for singular
  return `${value} ${unit}`;
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// New centralized class type options for consistency
export const CLASS_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'mma', label: 'MMA' },
  { value: 'bjj', label: 'Brazilian Jiu-Jitsu (BJJ)' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'kickboxing', label: 'Kickboxing' },
  { value: 'wrestling', label: 'Wrestling' },
  { value: 'judo', label: 'Judo' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'all_access', label: 'All Classes' },
];

export const DURATION_TYPES: Array<{ value: DurationType; label: string }> = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)' }
];

export const MEMBERSHIP_STATUSES: Array<{ value: MembershipStatus; label: string; color: string }> = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
];