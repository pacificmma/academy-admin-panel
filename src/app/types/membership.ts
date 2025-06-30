// src/app/types/membership.ts - Fixed and complete membership types
export type MembershipDuration = 
  | '1_week' 
  | '2_weeks' 
  | '3_weeks' 
  | '4_weeks' 
  | '1_month' 
  | '3_months' 
  | '6_months' 
  | '12_months' 
  | 'unlimited';

export type ClassType = 
  | 'bjj' 
  | 'mma' 
  | 'boxing' 
  | 'muay_thai' 
  | 'wrestling' 
  | 'fitness' 
  | 'yoga' 
  | 'kickboxing';

export type MembershipStatus = 'active' | 'inactive';

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  duration: MembershipDuration;
  price: number;
  currency: string;
  classTypes: ClassType[];
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface MembershipPlanFormData {
  name: string;
  description?: string;
  duration: MembershipDuration;
  price: number;
  currency: string;
  classTypes: ClassType[];
  status: MembershipStatus;
}

// Configuration objects for UI components
export const MEMBERSHIP_DURATIONS: { value: MembershipDuration; label: string }[] = [
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '3_weeks', label: '3 Weeks' },
  { value: '4_weeks', label: '4 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
  { value: '12_months', label: '12 Months' },
  { value: 'unlimited', label: 'Unlimited' },
];

export const CLASS_TYPES: { value: ClassType; label: string }[] = [
  { value: 'bjj', label: 'Brazilian Jiu-Jitsu (BJJ)' },
  { value: 'mma', label: 'Mixed Martial Arts (MMA)' },
  { value: 'boxing', label: 'Boxing' },
  { value: 'muay_thai', label: 'Muay Thai' },
  { value: 'wrestling', label: 'Wrestling' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'kickboxing', label: 'Kickboxing' },
];

export const MEMBERSHIP_STATUSES: { value: MembershipStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: '#4caf50' },
  { value: 'inactive', label: 'Inactive', color: '#9e9e9e' },
];

// Member membership types (for tracking individual member subscriptions)
export type MemberMembershipStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'pending';

export interface MemberMembership {
  id: string;
  memberId: string;
  membershipPlanId: string;
  status: MemberMembershipStatus;
  startDate: string;
  endDate: string;
  paymentReference?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  isChildMembership: boolean;
  parentMembershipId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  cancellationReason?: string;
  cancellationDate?: string;
  suspensionReason?: string;
  suspensionDate?: string;
}

export interface CreateMemberMembershipRequest {
  memberId: string;
  membershipPlanId: string;
  startDate: string;
  paymentReference?: string;
  isChildMembership?: boolean;
  parentMembershipId?: string;
}

export interface MemberMembershipFilters {
  memberId?: string;
  membershipPlanId?: string;
  status?: MemberMembershipStatus;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  isChildMembership?: boolean;
  searchTerm?: string;
}