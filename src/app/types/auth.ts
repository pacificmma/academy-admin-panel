// src/app/types/auth.ts - Authentication related types (UPDATED)

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
  lastLoginIP?: string;
  lastLoginUserAgent?: string;
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
}

// API Response interfaces
export interface LoginResponse {
  success: boolean;
  data?: {
    user: Omit<SessionData, 'createdAt' | 'expiresAt' | 'lastActivity'>;
    redirectTo: string;
  };
  message?: string;
  error?: string;
}

export interface SessionResponse {
  success: boolean;
  session?: Omit<SessionData, 'createdAt' | 'expiresAt' | 'lastActivity'>;
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