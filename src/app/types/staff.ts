// src/app/types/staff.ts - (Modified for consistency)
import { UserRole } from './auth';
import { BaseEntity } from './common'; // Assuming BaseEntity is from common.ts

export interface StaffData {
  fullName: string;
  email: string;
  role: UserRole;
  phoneNumber?: string; // Added as optional
  dateOfBirth?: string; // Added as optional
  emergencyContact?: { // Added as optional
    name?: string;
    phone?: string;
    relationship?: string;
  };
  specializations?: string[]; // Added as optional
  certifications?: string[]; // Added as optional
}

export interface StaffRecord extends StaffData, BaseEntity {
  uid: string;
  isActive: boolean;
  lastLoginAt?: string;
  profileImage?: string; // Keep existing optional properties
}

export interface CreateStaffRequest extends StaffData {
  password: string;
}

export interface UpdateStaffRequest {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  phoneNumber?: string; // Added for update requests
  dateOfBirth?: string; // Added for update requests
  emergencyContact?: { // Added for update requests
    name?: string;
    phone?: string;
    relationship?: string;
  };
  specializations?: string[]; // Added for update requests
  certifications?: string[]; // Added for update requests
}