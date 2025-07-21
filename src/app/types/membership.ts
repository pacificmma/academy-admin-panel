// src/app/types/membership.ts - Updated to support weekly attendance limits

export type DurationType = 'days' | 'weeks' | 'months' | 'years' | 'unlimited';
export type MembershipStatus = 'active' | 'inactive' | 'draft';
export type MemberMembershipStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'frozen';

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  durationValue: number;
  durationType: DurationType;
  price: number;
  currency: 'USD';
  classTypes: string[];
  status: MembershipStatus;
  
  // Weekly attendance limit fields
  weeklyAttendanceLimit?: number; // null/undefined means unlimited
  isUnlimited: boolean; // if true, no weekly limit applies
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface MembershipPlanFormData {
  name: string;
  description: string | undefined;
  durationValue: number;
  durationType: DurationType;
  price: number;
  currency: 'USD';
  classTypes: string[];
  status: MembershipStatus;
  
  // Weekly attendance limit fields
  weeklyAttendanceLimit?: number;
  isUnlimited: boolean;
}

export interface MemberMembership {
  id: string;
  memberId: string;
  membershipPlanId: string;
  startDate: string;
  endDate: string;
  status: MemberMembershipStatus;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  currency: 'USD';
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  
  // Freeze-related fields
  freezeStartDate?: string;
  freezeEndDate?: string;
  freezeReason?: string;
  originalEndDate?: string; // Store original end date before freeze
  
  // Cancellation fields
  cancellationReason?: string;
  cancelledBy?: string;
  
  // Classes tracking
  classesUsed?: number;
  maxClasses?: number;
  isUnlimited?: boolean;
  weeklyAttendanceLimit?: number; // Weekly attendance limit from plan
  currentWeekAttendance?: number; // Track current week usage
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  
  // Virtual fields populated from joins
  memberName?: string;
  memberEmail?: string;
  planName?: string;
  planClassTypes?: string[];
}

export interface MemberMembershipFilters {
  memberId?: string;
  membershipPlanId?: string;
  status?: MemberMembershipStatus;
  paymentStatus?: MemberMembership['paymentStatus'];
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  searchTerm?: string;
}

export interface MembershipStatusAction {
  action: 'freeze' | 'unfreeze' | 'cancel' | 'reactivate';
  reason: string;
  freezeDuration?: number; // in days
  freezeEndDate?: string; // specific end date for freeze
}

export interface MembershipStats {
  totalPlans: number;
  activePlans: number;
  inactivePlans: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  popularClassTypes?: Array<{
    type: string;
    count: number;
    color?: string;
  }>;
}

// Helper function to format duration
export function formatDuration(value: number, type: DurationType): string {
  if (type === 'unlimited') {
    return 'Unlimited';
  }
  
  if (value === 1) {
    switch (type) {
      case 'days': return '1 Day';
      case 'weeks': return '1 Week';
      case 'months': return '1 Month';
      case 'years': return '1 Year';
      default: return `1 ${type}`;
    }
  } else {
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
  if (durationType === 'unlimited') {
    // Return a date far in the future for unlimited memberships
    const farFuture = new Date(startDate);
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    return farFuture.toISOString().split('T')[0];
  }
  
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
export function getMembershipStatusColor(status: MemberMembershipStatus): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'active': return 'success';
    case 'frozen': return 'info';
    case 'suspended': return 'warning';
    case 'cancelled': return 'error';
    case 'expired': return 'default';
    default: return 'default';
  }
}

// Helper function to get membership status display text
export function getMembershipStatusText(status: MemberMembershipStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'frozen': return 'Frozen';
    case 'suspended': return 'Suspended';
    case 'cancelled': return 'Cancelled';
    case 'expired': return 'Expired';
    default: return status;
  }
}

// Helper function to calculate freeze duration
export function calculateFreezeEndDate(startDate: string, durationDays: number): string {
  const start = new Date(startDate);
  start.setDate(start.getDate() + durationDays);
  return start.toISOString();
}

// Helper function to format weekly attendance limit
export function formatWeeklyAttendanceLimit(weeklyLimit?: number, isUnlimited?: boolean): string {
  if (isUnlimited || !weeklyLimit) {
    return 'Unlimited per week';
  }
  return `${weeklyLimit} ${weeklyLimit === 1 ? 'day' : 'days'} per week`;
}