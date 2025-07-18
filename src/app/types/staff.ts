// src/app/types/staff.ts - UPDATED FOR NEW ROLE SYSTEM
import { UserRole } from './auth';

export interface StaffRecord {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole; // Now only 'admin' | 'trainer' | 'visiting_trainer'
  isActive: boolean;
  specializations?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  // Security fields (only visible to admins)
  lastLoginAt?: string;
  lastLoginIP?: string;
  failedLoginAttempts?: number;
  accountLockoutUntil?: string;
}

export interface CreateStaffRequest {
  email: string;
  fullName: string;
  phoneNumber?: string;
  password: string;
  role: UserRole; // Only 'admin' | 'trainer' | 'visiting_trainer'
  specializations?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
}

export interface UpdateStaffRequest {
  fullName?: string;
  phoneNumber?: string;
  role?: UserRole; // Only 'admin' | 'trainer' | 'visiting_trainer'
  isActive?: boolean;
  specializations?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
}

export interface StaffFilters {
  role?: UserRole; // Only 'admin' | 'trainer' | 'visiting_trainer'
  isActive?: boolean;
  searchTerm?: string;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  adminCount: number;
  trainerCount: number;
  visitingTrainerCount: number; // Added for visiting trainers
}

// Client-safe version (without sensitive fields)
export type ClientSafeStaffRecord = Omit<StaffRecord, 'lastLoginIP' | 'failedLoginAttempts' | 'accountLockoutUntil'>;

// Form data interfaces
export interface StaffFormData {
  email: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: UserRole; // Only 'admin' | 'trainer' | 'visiting_trainer'
  specializations: string[];
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes: string;
}

// Role display utilities
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'trainer':
      return 'Trainer';
    case 'visiting_trainer':
      return 'Visiting Trainer';
    default:
      return 'Unknown';
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Full system access - can manage all users, classes, and settings';
    case 'trainer':
      return 'Can manage assigned classes and view schedules';
    case 'visiting_trainer':
      return 'Can view and manage only assigned classes with limited access';
    default:
      return 'Unknown role';
  }
}