// src/app/types/member.ts - Member types definition
import { UserRole } from './auth';

export interface MemberRecord {
  id: string;
  uid: string; // Firebase Auth UID for member login (in separate app)
  email: string;
  fullName: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phoneNumber?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  awards: Array<{
    title: string;
    awardedDate: string; // ISO date string
  }>;
  parentId?: string; // For linking child members to parent accounts
  isActive: boolean;
  role: 'member'; // Always member for this collection
  classRegistrations: string[]; // Array of class instance IDs
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateMemberRequest {
  email: string;
  fullName: string;
  password: string; // For Firebase Auth account creation
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phoneNumber?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  awards?: Array<{
    title: string;
    awardedDate: string;
  }>;
  parentId?: string;
  assignMembership?: {
    membershipPlanId: string;
    startDate: string;
  };
}

export interface UpdateMemberRequest {
  fullName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phoneNumber?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  awards?: Array<{
    title: string;
    awardedDate: string;
  }>;
  parentId?: string;
  isActive?: boolean;
}

export interface MemberFilters {
  parentId?: string;
  isActive?: boolean;
  searchTerm?: string;
  hasParent?: boolean; // Filter for independent vs linked members
}

export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  linkedMembers: number; // Members with parentId
  independentMembers: number; // Members without parentId
}

// Client-safe version (without sensitive fields)
export type ClientSafeMemberRecord = Omit<MemberRecord, 'uid'>;

// Form data interfaces
export interface MemberFormData {
  email: string;
  fullName: string;
  password: string;
  confirmPassword: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phoneNumber: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  awards: Array<{
    title: string;
    awardedDate: string;
  }>;
  parentId: string;
  assignMembership?: {
    membershipPlanId: string;
    startDate: string;
  };
}