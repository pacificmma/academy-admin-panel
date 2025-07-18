// src/app/types/auth.ts - UPDATED ROLES
export type UserRole = 'admin' | 'trainer' | 'visiting_trainer';

// Role hierarchy and permissions
export const ROLE_HIERARCHY = {
  admin: 3,
  trainer: 2,
  visiting_trainer: 1,
} as const;

// Permission checking functions
export function hasAdminPermission(role: UserRole): boolean {
  return role === 'admin';
}

export function hasTrainerPermission(role: UserRole): boolean {
  return ['admin', 'trainer', 'visiting_trainer'].includes(role);
}

export function canManageStaff(role: UserRole): boolean {
  return role === 'admin';
}

export function canManageClasses(role: UserRole): boolean {
  return ['admin', 'trainer'].includes(role);
}

export function canViewClasses(role: UserRole): boolean {
  return ['admin', 'trainer', 'visiting_trainer'].includes(role);
}

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Administrator',
  trainer: 'Trainer',
  visiting_trainer: 'Visiting Trainer',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system access - can manage all users, classes, and settings',
  trainer: 'Can manage assigned classes and view schedules',
  visiting_trainer: 'Can view and manage only assigned classes with limited access',
};