// src/app/types/staff.ts - FIXED VERSION
import { UserRole } from './auth';

export interface StaffRecord {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
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
  role: UserRole;
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
  role?: UserRole;
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
  role?: UserRole;
  isActive?: boolean;
  searchTerm?: string;
}

export interface StaffStats {
  totalStaff: number;
  activeStaff: number;
  inactiveStaff: number;
  adminCount: number;
  trainerCount: number;
  staffCount: number;
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
  role: UserRole;
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