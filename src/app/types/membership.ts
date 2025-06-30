// src/app/types/membership.ts - Clean and Simple Types
export type DurationType = 'days' | 'weeks' | 'months' | 'years';
export type MembershipStatus = 'active' | 'inactive';

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

// Missing interfaces from the hook
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

// Default class types - admin can add more
export const DEFAULT_CLASS_TYPES = [
  'MMA',
  'Brazilian Jiu-Jitsu (BJJ)',
  'Boxing',
  'Muay Thai',
  'Kickboxing',
  'Wrestling',
  'Judo',
  'Fitness',
  'All Classes'
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