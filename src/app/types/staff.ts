// src/app/types/staff.ts
// src/app/types/staff.ts - (Modified for consistency and new optional fields)
import { UserRole } from './auth';
import { BaseEntity } from './common'; // Assuming BaseEntity is from common.ts

export interface StaffData {
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber?: string; // Added as optional
  dateOfBirth?: string; // Added as optional
  emergencyContact?: { // Added as optional
    name?: string; // Made optional to match frontend removal
    phone?: string; // Made optional to match frontend removal
    relationship?: string; // Made optional to match frontend removal
  };
  specializations?: string[]; // Added as optional
  certifications?: string[]; // Added as optional
}

export interface StaffRecord extends StaffData, BaseEntity {
  uid: string; // Firebase Auth UID, used as document ID
  isActive: boolean;
  lastLoginAt?: string;
  profileImage?: string; // Keep existing optional properties
  // Security fields, only for backend, not exposed to frontend API responses directly
  // password?: string; // REMOVED: Should never be here, only in CreateStaffRequest hashed
  // lastLoginIP?: string;
  // lastLoginUserAgent?: string;
  // failedLoginAttempts?: number;
  // accountLockoutUntil?: string;
}

export interface CreateStaffRequest extends StaffData {
  password: string; // Password is required for creation
}

export interface UpdateStaffRequest extends Partial<StaffData> { // Allow partial updates of StaffData fields
  isActive?: boolean;
}

export type { UserRole };
