// src/app/types/staff.ts - Temizlenmiş version
import { UserRole } from './auth';

// Base entity type (moved from common.ts)
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffData {
  fullName: string;
  email: string;
  role: UserRole;
}

export interface StaffRecord extends StaffData, BaseEntity {
  uid: string;
  isActive: boolean;
  lastLoginAt?: string;
  phone?: string;
  profileImage?: string;
}

export interface CreateStaffRequest extends StaffData {
  password: string;
  phone?: string;
}

export interface UpdateStaffRequest {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  phone?: string;
}