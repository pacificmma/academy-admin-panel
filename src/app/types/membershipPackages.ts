// src/app/types/membershipPackages.ts
export type DurationType = 'months' | 'weeks' | 'days';
export type MembershipPackageStatus = 'Active' | 'Inactive' | 'Archived';
export type AgeGroup = 'adult' | 'youth' | 'both';

export interface SportCategoryDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  displayOrder: number;
  ageRestrictions?: AgeGroup;
}

export interface MembershipPackageFormData {
  name: string;
  description?: string;
  duration: number;
  durationType: DurationType;
  price: number;
  
  // Age restrictions
  ageGroup: AgeGroup;
  minAge?: number;
  maxAge?: number;
  
  // Access control
  sportCategories: string[];
  isFullAccess: boolean;
  
  // Usage limits
  isUnlimited: boolean;
  classLimitPerWeek?: number;
  classLimitPerMonth?: number;
  
  // Policies
  allowFreeze: boolean;
  maxFreezeMonths?: number;
  minFreezeWeeks?: number;
  guestPassesIncluded: number;
  
  // Renewal & commitment
  autoRenewal: boolean;
  renewalDiscountPercent?: number;
  earlyTerminationFee?: number;
  minimumCommitmentMonths?: number;
  
  // Status & ordering
  status: MembershipPackageStatus;
  isPopular: boolean;
  displayOrder: number;
}

export interface MembershipPackageRecord extends MembershipPackageFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;
}

export interface PackageUsageStats {
  packageId: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
  averageRating?: number;
  totalReviews?: number;
  conversionRate?: number;
  churnRate?: number;
  averageLifetimeValue?: number;
}

export interface MembershipSubscription {
  id: string;
  packageId: string;
  memberId: string;
  memberName: string;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired';
  startDate: Date;
  endDate: Date;
  amountPaid: number;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageFilterOptions {
  status?: MembershipPackageStatus[];
  priceRange?: { min?: number; max?: number };
  sportCategories?: string[];
  ageGroup?: AgeGroup[];
  isPopular?: boolean;
  isFullAccess?: boolean;
  isUnlimited?: boolean;
}

export interface PackageSortOptions {
  field: 'name' | 'price' | 'createdAt' | 'displayOrder' | 'popularity';
  direction: 'asc' | 'desc';
}

export interface PackageSearchParams {
  query?: string;
  filters?: PackageFilterOptions;
  sort?: PackageSortOptions;
  page?: number;
  limit?: number;
}

export interface PackageListResponse {
  packages: MembershipPackageRecord[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}