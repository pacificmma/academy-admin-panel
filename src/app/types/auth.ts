// src/app/types/auth.ts - Authentication related types

export type UserRole = 'admin' | 'trainer' | 'staff';

export interface SessionData {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface PermissionCheck {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

export interface AuthContextType {
  user: any | null;
  sessionData: SessionData | null;
  loading: boolean;
  logout: () => Promise<void>;
  protectSession: () => void;
  unprotectSession: () => void;
  refreshSession: () => Promise<void>;
}