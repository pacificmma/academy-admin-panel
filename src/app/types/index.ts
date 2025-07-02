// src/app/types/index.ts - UPDATED EXPORTS
// ============================================

// Core types
export * from './auth';
export * from './staff';
export * from './api';
export * from './ui';
export * from './class';
export * from './membership';
export * from './common';

// Commonly used type aliases for convenience
export type { UserRole, AuthUser, SessionData } from './auth';
export type { StaffRecord, CreateStaffRequest, ClientSafeStaffRecord } from './staff';
export type { ApiResponse, PaginatedResponse, ApiError } from './api';
export type { ButtonProps, InputProps, AlertProps } from './ui';
export type { 
  ClassType, 
  ClassStatus, 
  ClassSchedule, 
  ClassInstance, 
  ClassFormData,
  ClassFilters
} from './class';
export type { 
  MembershipPlan, 
  MembershipPlanFormData, 
  MemberMembership,
  DurationType,
  MembershipStatus
} from './membership';