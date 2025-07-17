// src/app/types/membership.ts - Updated to support dynamic class types

export type DurationType = 'days' | 'weeks' | 'months' | 'years';
export type MembershipStatus = 'active' | 'inactive' | 'draft';

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  durationValue: number;
  durationType: DurationType;
  price: number;
  currency: 'USD'; // Fixed to USD only
  classTypes: string[]; // Array of class type names (dynamic)
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface MembershipPlanFormData {
  name: string;
  description: string;
  durationValue: number;
  durationType: DurationType;
  price: number;
  currency: 'USD'; // Fixed to USD only
  classTypes: string[]; // Array of class type names (dynamic)
  status: MembershipStatus;
}

export interface MemberMembership {
  id: string;
  memberId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  currency: 'USD'; // Fixed to USD only
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  // Virtual fields populated from joins
  memberName?: string;
  memberEmail?: string;
  planName?: string;
  planClassTypes?: string[]; // Dynamic class types
}

export interface MembershipStats {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  popularClassTypes?: Array<{
    type: string; // Dynamic class type name
    count: number;
    color?: string;
  }>;
}

// Helper function to format duration
export function formatDuration(value: number, type: DurationType): string {
  if (value === 1) {
    // Singular forms
    switch (type) {
      case 'days': return '1 Day';
      case 'weeks': return '1 Week';
      case 'months': return '1 Month';
      case 'years': return '1 Year';
      default: return `1 ${type}`;
    }
  } else {
    // Plural forms
    switch (type) {
      case 'days': return `${value} Days`;
      case 'weeks': return `${value} Weeks`;
      case 'months': return `${value} Months`;
      case 'years': return `${value} Years`;
      default: return `${value} ${type}`;
    }
  }
}

// Helper function to calculate end date
export function calculateEndDate(startDate: string, durationValue: number, durationType: DurationType): string {
  const start = new Date(startDate);
  
  switch (durationType) {
    case 'days':
      start.setDate(start.getDate() + durationValue);
      break;
    case 'weeks':
      start.setDate(start.getDate() + (durationValue * 7));
      break;
    case 'months':
      start.setMonth(start.getMonth() + durationValue);
      break;
    case 'years':
      start.setFullYear(start.getFullYear() + durationValue);
      break;
  }
  
  return start.toISOString().split('T')[0];
}

// Helper function to check if membership is expiring soon
export function isExpiringSoon(endDate: string, daysThreshold: number = 7): boolean {
  const end = new Date(endDate);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  
  return end <= threshold && end >= new Date();
}

// Helper function to get membership status color
export function getMembershipStatusColor(status: MembershipStatus): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'active': return 'success';
    case 'inactive': return 'error';
    case 'draft': return 'warning';
    default: return 'default';
  }
}