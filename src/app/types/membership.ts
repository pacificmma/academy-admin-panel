// src/app/types/membership.ts - Fixed version with week options
import { BaseEntity } from './common';

// Membership plan duration types - UPDATED WITH WEEK OPTIONS
export type MembershipDuration = '1_week' | '2_weeks' | '3_weeks' | '4_weeks' | '1_month' | '3_months' | '6_months' | '12_months' | 'unlimited';

// Class types available at the gym
export type ClassType = 'bjj' | 'mma' | 'muay_thai' | 'boxing' | 'general_fitness' | 'all';

// Membership plan status
export type MembershipStatus = 'active' | 'inactive' | 'archived';

// Simplified core membership plan interface
export interface MembershipPlan extends BaseEntity {
  memberCount?: number;
  name: string;
  description?: string;
  duration: MembershipDuration;
  durationInDays: number; // Auto-calculated based on duration
  price: number;
  currency: string;
  classTypes: ClassType[];
  status: MembershipStatus;
  displayOrder: number; // For sorting in lists
  createdBy?: string;
}

// Simplified form data for creating/editing membership plans
export interface MembershipPlanFormData {
  currency?: string;
  name: string;
  description?: string;
  duration: MembershipDuration;
  price: number;
  classTypes: ClassType[];
  status: MembershipStatus;
}

// API request types
export interface CreateMembershipPlanRequest extends MembershipPlanFormData {}

export interface UpdateMembershipPlanRequest extends Partial<MembershipPlanFormData> {}

// Member's active membership instance (unchanged as it's core functionality)
export interface MemberMembership extends BaseEntity {
  memberId: string;
  membershipPlanId: string;
  membershipPlan?: MembershipPlan;
  startDate: string;
  endDate: string;
  isActive: boolean;
  remainingClasses?: number;
  usedClasses: number;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  purchasePrice: number;
  discountApplied?: string;
  discountAmount?: number;
  autoRenew: boolean;
  cancellationDate?: string;
  cancellationReason?: string;
  notes?: string;
}

// Member membership creation request
export interface CreateMemberMembershipRequest {
  memberId: string;
  membershipPlanId: string;
  startDate: string;
  amountPaid: number;
  currency: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'online' | 'family_plan';
  paymentReference?: string;
  discountApplied?: string;
  discountAmount?: number;
  autoRenewal: boolean;
  isChildMembership: boolean;
  parentMembershipId?: string;
  adminNotes?: string;
}

// Member membership filters
export interface MemberMembershipFilters {
  memberId?: string;
  membershipPlanId?: string;
  status?: 'active' | 'expired' | 'cancelled' | 'suspended';
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  isChildMembership?: boolean;
  searchTerm?: string;
}

// Membership plan filters (for API queries)
export interface MembershipPlanFilters {
  type?: string;
  isActive?: boolean;
  isPublic?: boolean;
  minPrice?: number;
  maxPrice?: number;
  duration?: string;
  searchTerm?: string;
  adminNotes?: string;
}

// Statistics and analytics types
export interface MembershipStats {
  totalPlans: number;
  activePlans: number;
}

// Filter and search options for UI
export interface MembershipFilters {
  status?: MembershipStatus[];
  classTypes?: ClassType[];
  duration?: MembershipDuration[];
  priceRange?: {
    min: number;
    max: number;
  };
  search?: string;
}

// Constants and options - UPDATED WITH WEEK OPTIONS
export const MEMBERSHIP_DURATIONS = [
  { value: '1_week', label: '1 Week', days: 7 },
  { value: '2_weeks', label: '2 Weeks', days: 14 },
  { value: '3_weeks', label: '3 Weeks', days: 21 },
  { value: '4_weeks', label: '4 Weeks', days: 28 },
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
  { value: '12_months', label: '12 Months', days: 365 },
  { value: 'unlimited', label: 'Unlimited', days: 9999 },
] as const;

export const CLASS_TYPES: { value: ClassType; label: string; color: string }[] = [
  { value: 'bjj', label: 'Brazilian Jiu-Jitsu', color: '#1976d2' },
  { value: 'mma', label: 'Mixed Martial Arts', color: '#d32f2f' },
  { value: 'muay_thai', label: 'Muay Thai', color: '#f57c00' },
  { value: 'boxing', label: 'Boxing', color: '#388e3c' },
  { value: 'general_fitness', label: 'General Fitness', color: '#7b1fa2' },
  { value: 'all', label: 'All Classes', color: '#455a64' },
];

export const MEMBERSHIP_STATUSES: { value: MembershipStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: '#4caf50' },
  { value: 'inactive', label: 'Inactive', color: '#ff9800' },
  { value: 'archived', label: 'Archived', color: '#9e9e9e' },
];

// Simplified default membership plan template
export const DEFAULT_MEMBERSHIP_PLAN: Partial<MembershipPlanFormData> = {
  status: 'active',
};

// Simplified validation rules
export const MEMBERSHIP_VALIDATION = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  description: {
    maxLength: 500,
  },
  price: {
    required: true,
    min: 0,
    max: 10000,
  },
  classTypes: {
    required: true,
    minItems: 1,
  },
} as const;