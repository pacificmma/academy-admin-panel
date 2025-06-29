// src/app/types/membership.ts - Membership related types and interfaces

import { BaseEntity } from './staff';

// Core membership types
export type MembershipType = 
  | 'full_access' 
  | 'bjj_only' 
  | 'mma_only' 
  | 'boxing_only' 
  | 'muay_thai_only' 
  | 'kickboxing_only'
  | 'wrestling_only'
  | 'judo_only'
  | 'karate_only'
  | 'custom';

export type MembershipDuration = 1 | 3 | 6 | 12; // months

export type MembershipStatus = 'active' | 'inactive' | 'archived';

// Membership plan structure
export interface MembershipPlan extends BaseEntity {
  name: string;
  description?: string;
  type: MembershipType;
  duration: MembershipDuration; // in months
  price: number;
  currency: string; // ISO currency code (USD, EUR, etc.)
  
  // Features and access
  includedClasses: string[]; // Array of class types included
  classLimitPerMonth?: number; // null means unlimited
  personalTrainingIncluded?: number; // Number of sessions
  guestPassesIncluded?: number;
  
  // Restrictions and conditions
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
  };
  
  // Administrative
  isActive: boolean;
  isPublic: boolean; // Should appear on public membership page
  sortOrder: number; // For display ordering
  maxActiveMembers?: number; // Limit total active members for this plan
  
  // Special conditions
  requiresPhysicalExam?: boolean;
  requiresParentalConsent?: boolean; // For minors
  
  // Promotional
  isPromotional?: boolean;
  promotionalEndDate?: string;
  originalPrice?: number; // If promotional, store original price
  
  // Auto-renewal and billing
  autoRenewal: boolean;
  gracePeriodDays: number; // Days after expiration before suspension
  
  // Metadata
  createdBy: string; // Admin user ID
  lastModifiedBy?: string;
  notes?: string; // Internal admin notes
}

// Member's active membership instance
export interface MemberMembership extends BaseEntity {
  memberId: string;
  membershipPlanId: string;
  
  // Dates
  startDate: string;
  endDate: string;
  purchaseDate: string;
  
  // Payment info
  amountPaid: number;
  currency: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'online' | 'family_plan';
  paymentReference?: string;
  discountApplied?: string; // Discount code used
  discountAmount?: number;
  
  // Status
  status: 'active' | 'expired' | 'cancelled' | 'suspended' | 'pending';
  
  // Usage tracking
  classesAttended: number;
  personalTrainingUsed: number;
  guestPassesUsed: number;
  
  // Family linking
  parentMembershipId?: string; // If this is a child membership linked to parent
  isChildMembership: boolean;
  
  // Administrative
  createdBy: string; // Admin user ID who created this membership
  cancelledBy?: string; // Admin user ID who cancelled
  cancellationReason?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  suspensionDate?: string;
  
  // Auto-renewal
  autoRenewal: boolean;
  nextBillingDate?: string;
  
  // Notes
  adminNotes?: string;
  memberNotes?: string;
}

// Membership plan creation/update requests
export interface CreateMembershipPlanRequest {
  name: string;
  description?: string;
  type: MembershipType;
  duration: MembershipDuration;
  price: number;
  currency: string;
  includedClasses: string[];
  classLimitPerMonth?: number;
  personalTrainingIncluded?: number;
  guestPassesIncluded?: number;
  ageRestrictions?: {
    minAge?: number;
    maxAge?: number;
  };
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  maxActiveMembers?: number;
  requiresPhysicalExam?: boolean;
  requiresParentalConsent?: boolean;
  autoRenewal: boolean;
  gracePeriodDays: number;
  notes?: string;
}

export interface UpdateMembershipPlanRequest extends Partial<CreateMembershipPlanRequest> {
  lastModifiedBy: string;
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
  createdBy: string;
}

// Membership statistics and analytics
export interface MembershipStats {
  totalPlans: number;
  activePlans: number;
  totalActiveMembers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageMembershipDuration: number;
  
  // Plan-specific stats
  planStats: {
    [planId: string]: {
      name: string;
      activeMembers: number;
      totalRevenue: number;
      averageDuration: number;
    };
  };
  
  // Monthly breakdown
  monthlyBreakdown: {
    month: string;
    newMemberships: number;
    renewals: number;
    cancellations: number;
    revenue: number;
  }[];
}

// Search and filtering
export interface MembershipPlanFilters {
  type?: MembershipType;
  isActive?: boolean;
  isPublic?: boolean;
  minPrice?: number;
  maxPrice?: number;
  duration?: MembershipDuration;
  searchTerm?: string;
}

export interface MemberMembershipFilters {
  memberId?: string;
  membershipPlanId?: string;
  status?: MemberMembership['status'];
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  isChildMembership?: boolean;
  searchTerm?: string;
}

// Class types for membership plans
export const AVAILABLE_CLASS_TYPES = [
  'BJJ Fundamentals',
  'BJJ Advanced',
  'BJJ Competition',
  'MMA Basics',
  'MMA Advanced',
  'Boxing Fundamentals',
  'Boxing Advanced',
  'Muay Thai',
  'Kickboxing',
  'Wrestling',
  'Judo',
  'Karate',
  'Self Defense',
  'Cardio Kickboxing',
  'Youth Classes',
  'Women Only Classes',
  'Open Mat',
  'Personal Training',
] as const;

export type ClassType = typeof AVAILABLE_CLASS_TYPES[number];

// Default membership plan templates
export const DEFAULT_MEMBERSHIP_PLANS: Omit<MembershipPlan, keyof BaseEntity | 'createdBy'>[] = [
  {
    name: '1 Month Full Access',
    description: 'Complete access to all classes and facilities for 1 month',
    type: 'full_access',
    duration: 1,
    price: 150,
    currency: 'USD',
    includedClasses: [...AVAILABLE_CLASS_TYPES],
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    autoRenewal: true,
    gracePeriodDays: 3,
  },
  {
    name: '3 Month Full Access',
    description: 'Complete access to all classes and facilities for 3 months',
    type: 'full_access',
    duration: 3,
    price: 400,
    currency: 'USD',
    includedClasses: [...AVAILABLE_CLASS_TYPES],
    isActive: true,
    isPublic: true,
    sortOrder: 2,
    autoRenewal: true,
    gracePeriodDays: 7,
  },
  {
    name: '6 Month Full Access',
    description: 'Complete access to all classes and facilities for 6 months',
    type: 'full_access',
    duration: 6,
    price: 750,
    currency: 'USD',
    includedClasses: [...AVAILABLE_CLASS_TYPES],
    isActive: true,
    isPublic: true,
    sortOrder: 3,
    autoRenewal: true,
    gracePeriodDays: 14,
  },
  {
    name: '12 Month Full Access',
    description: 'Complete access to all classes and facilities for 1 year',
    type: 'full_access',
    duration: 12,
    price: 1400,
    currency: 'USD',
    includedClasses: [...AVAILABLE_CLASS_TYPES],
    isActive: true,
    isPublic: true,
    sortOrder: 4,
    autoRenewal: true,
    gracePeriodDays: 30,
  },
  {
    name: '3 Month BJJ Only',
    description: 'Access to Brazilian Jiu-Jitsu classes only for 3 months',
    type: 'bjj_only',
    duration: 3,
    price: 300,
    currency: 'USD',
    includedClasses: ['BJJ Fundamentals', 'BJJ Advanced', 'BJJ Competition', 'Open Mat'],
    isActive: true,
    isPublic: true,
    sortOrder: 5,
    autoRenewal: true,
    gracePeriodDays: 7,
  },
  {
    name: '6 Month MMA',
    description: 'Mixed Martial Arts focused training for 6 months',
    type: 'mma_only',
    duration: 6,
    price: 600,
    currency: 'USD',
    includedClasses: ['MMA Basics', 'MMA Advanced', 'Boxing Fundamentals', 'Wrestling', 'BJJ Fundamentals'],
    isActive: true,
    isPublic: true,
    sortOrder: 6,
    autoRenewal: true,
    gracePeriodDays: 14,
  },
];

// Validation helpers
export const MEMBERSHIP_VALIDATION = {
  name: {
    minLength: 3,
    maxLength: 100,
  },
  description: {
    maxLength: 500,
  },
  price: {
    min: 0,
    max: 10000,
  },
  duration: {
    allowedValues: [1, 3, 6, 12] as MembershipDuration[],
  },
  gracePeriodDays: {
    min: 0,
    max: 90,
  },
  sortOrder: {
    min: 0,
    max: 1000,
  },
} as const;