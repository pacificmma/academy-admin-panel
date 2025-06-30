// src/app/types/auth.ts - FIXED Authentication types with better security
export type UserRole = 'admin' | 'trainer' | 'staff';

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
  role: UserRole;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  // ✅ SECURITY: Remove sensitive fields from client-side types
  // lastLoginIP and lastLoginUserAgent should only exist in backend
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

// API Response interfaces - SECURE VERSIONS
export interface LoginResponse {
  success: boolean;
  data?: {
    // ✅ SECURITY: Only return minimal data needed for redirect
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
    // ✅ SECURITY: Don't expose timestamp data in API responses
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
  // Server-side only fields
  lastLoginIP?: string;
  lastLoginUserAgent?: string;
  failedLoginAttempts?: number;
  lastFailedLoginAt?: string;
  accountLockoutUntil?: string;
  securityFlags?: string[];
}

export interface UserDocument extends AuthUser, SecureUserData {
  // Complete user document structure for Firestore
  password?: never; // Passwords should never be in the document
}

// Client-safe user data (excludes sensitive server-side fields)
export type ClientSafeUser = Omit<UserDocument, keyof SecureUserData>;