// src/app/types/auth.ts (Updated to include 'role' in AuthUser)
export type UserRole = 'admin' | 'visiting_trainer' | 'trainer' | 'member';

export interface AuthSession {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

export interface User {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole; // This was already here, keeping for consistency
  isActive: boolean;
}

export interface SessionData {
  uid: string;
  email: string;
  role: UserRole;
  fullName: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  role: UserRole; // Added this property to resolve the compilation error when using `user?.role`
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface PermissionCheck {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  sessionData: SessionData | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  protectSession: () => void;
  unprotectSession: () => void;
}

// API Response interfaces
export interface LoginResponse {
  success: boolean;
  data?: {
    role: UserRole;
    redirectTo: string;
  };
  message?: string;
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  session?: {
    uid: string;
    email: string;
    role: UserRole;
    fullName: string;
    isActive: boolean;
  };
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

// Security interfaces
export interface RateLimitInfo {
  allowed: boolean;
  resetTime: number;
  remainingRequests?: number;
}

export interface SecurityEvent {
  type: 'login_failed' | 'login_success' | 'session_expired' | 'unauthorized_access';
  ip: string;
  userAgent?: string;
  email?: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Enhanced security types
export interface SecureUserData {
  lastLoginIP?: string;
  lastLoginUserAgent?: string;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: string;
  accountLockoutUntil?: string;
  securityFlags?: string[];
  password?: string;
}

export interface UserDocument extends AuthUser, SecureUserData {
}

export type ClientSafeUser = Omit<UserDocument, keyof SecureUserData>;