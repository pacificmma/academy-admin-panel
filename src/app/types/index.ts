// src/app/types/index.ts - UPDATED EXPORTS with member types
// ============================================

// Core types
export * from './auth';
export * from './staff';
export * from './member'; // New member types export
export * from './api';
export * from './ui';
export * from './class';
export * from './membership';
export * from './common';

// Commonly used type aliases for convenience
export type { UserRole, AuthUser, SessionData } from './auth';
export type { StaffRecord, CreateStaffRequest, ClientSafeStaffRecord } from './staff';
export type { 
  MemberRecord, 
  CreateMemberRequest, 
  ClientSafeMemberRecord, 
  MemberFormData,
  MemberStats,
  MemberFilters 
} from './member'; // New member type exports
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