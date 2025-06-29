// src/app/types/membership.ts - Complete membership management types
import { BaseEntity } from './common';

// Membership plan duration types
export type MembershipDuration = '1_month' | '3_months' | '6_months' | '12_months' | 'unlimited';

// Class types available at the gym
export type ClassType = 'bjj' | 'mma' | 'muay_thai' | 'boxing' | 'general_fitness' | 'all';

// Membership plan status
export type MembershipStatus = 'active' | 'inactive' | 'archived';

// Core membership plan interface
export interface MembershipPlan extends BaseEntity {
  name: string;
  description?: string;
  duration: MembershipDuration;
  durationInDays: number; // Auto-calculated based on duration
  price: number;
  currency: string;
  classTypes: ClassType[];
  maxClassesPerWeek?: number; // null = unlimited
  maxClassesPerMonth?: number; // null = unlimited
  allowDropIns: boolean;
  includedFeatures: string[];
  status: MembershipStatus;
  isPopular?: boolean; // For highlighting in UI
  colorCode?: string; // For UI theming
  displayOrder: number; // For sorting in lists
}

// Form data for creating/editing membership plans
export interface MembershipPlanFormData {
  name: string;
  description?: string;
  duration: MembershipDuration;
  price: number;
  classTypes: ClassType[];
  maxClassesPerWeek?: number;
  maxClassesPerMonth?: number;
  allowDropIns: boolean;
  includedFeatures: string[];
  status: MembershipStatus;
  isPopular?: boolean;
  colorCode?: string;
}

// API request types
export interface CreateMembershipPlanRequest extends MembershipPlanFormData {}

export interface UpdateMembershipPlanRequest extends Partial<MembershipPlanFormData> {}

// Member's active membership instance
export interface MemberMembership extends BaseEntity {
  memberId: string;
  membershipPlanId: string;
  membershipPlan?: MembershipPlan; // Populated in queries
  startDate: string;
  endDate: string;
  isActive: boolean;
  remainingClasses?: number; // For limited plans
  usedClasses: number;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  purchasePrice: number; // Price at time of purchase
  discountApplied?: string; // Discount code used
  discountAmount?: number;
  autoRenew: boolean;
  cancellationDate?: string;
  cancellationReason?: string;
  notes?: string;
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

// Statistics and analytics types
export interface MembershipStats {
  totalPlans: number;
  activePlans: number;
  totalRevenue: number;
  monthlyRevenue: number;
  popularPlan: string;
  membershipDistribution: {
    planId: string;
    planName: string;
    memberCount: number;
    percentage: number;
  }[];
}

// Filter and search options
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

// Constants and options
export const MEMBERSHIP_DURATIONS: { value: MembershipDuration; label: string; days: number }[] = [
  { value: '1_month', label: '1 Month', days: 30 },
  { value: '3_months', label: '3 Months', days: 90 },
  { value: '6_months', label: '6 Months', days: 180 },
  { value: '12_months', label: '12 Months', days: 365 },
  { value: 'unlimited', label: 'Unlimited', days: 0 },
];

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

// Default membership plan template
export const DEFAULT_MEMBERSHIP_PLAN: Partial<MembershipPlanFormData> = {
  allowDropIns: true,
  status: 'active',
  isPopular: false,
  includedFeatures: ['Access to all facilities', 'Shower facilities', 'Equipment usage'],
};

// Validation rules
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
  maxClassesPerWeek: {
    min: 1,
    max: 30,
  },
  maxClassesPerMonth: {
    min: 1,
    max: 120,
  },
} as const;