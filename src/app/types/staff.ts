// src/app/types/staff.ts - Staff management types (cleaned)

import { UserRole, BaseEntity } from './index';

export interface StaffData {
  fullName: string;
  email: string;
  role: UserRole;
}

export interface StaffRecord extends StaffData, BaseEntity {
  uid: string;
  isActive: boolean;
  deactivatedAt?: string;
  lastLoginAt?: string;
  profileImage?: string;
  phone?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  certifications?: string[];
  specialties?: string[];
  bio?: string;
  dateOfBirth?: string;
  hireDate?: string;
}

export interface CreateStaffRequest extends StaffData {
  password: string;
  phone?: string;
  address?: string;
  hireDate?: string;
  certifications?: string[];
  specialties?: string[];
}

export interface UpdateStaffRequest {
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
  phone?: string;
  address?: string;
  certifications?: string[];
  specialties?: string[];
  bio?: string;
  profileImage?: string;
}

export interface StaffFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  certification?: string;
  specialty?: string;
  hiredAfter?: string;
  hiredBefore?: string;
}

export interface StaffListResponse {
  staff: StaffRecord[];
  total: number;
  page: number;
  limit: number;
  filters?: StaffFilters;
}

export interface StaffPerformanceMetrics {
  staffId: string;
  totalClasses: number;
  averageRating: number;
  attendanceRate: number;
  memberFeedbackScore: number;
  certificationCount: number;
  lastEvaluationDate?: string;
  nextEvaluationDate?: string;
}

export interface StaffSchedule {
  staffId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isAvailable: boolean;
  classType?: string;
  maxClasses?: number;
}

export interface StaffAvailability {
  staffId: string;
  date: string;
  isAvailable: boolean;
  reason?: string;
  startTime?: string;
  endTime?: string;
}