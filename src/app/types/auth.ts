// src/app/types/auth.ts - GÜNCELLENMİŞ ROLLER
export type UserRole = 'admin' | 'trainer' | 'visiting_trainer' | 'staff'; // 'staff' rolü eklendi

// Oturum verisi arayüzü (önceki düzeltmelerden korundu)
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

// Kimlik doğrulama kullanıcısı arayüzü (önceki düzeltmelerden korundu)
export interface AuthUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

// Giriş kimlik bilgileri arayüzü (önceki düzeltmelerden korundu)
export interface LoginCredentials {
  email: string;
  password: string;
}

// Rol hiyerarşisi ve izinler
export const ROLE_HIERARCHY = {
  admin: 3,
  trainer: 2,
  visiting_trainer: 1,
  staff: 1, // 'staff' rolü eklendi, visiting_trainer ile aynı hiyerarşi seviyesinde
} as const;

// İzin kontrol fonksiyonları
export function hasAdminPermission(role: UserRole): boolean {
  return role === 'admin';
}

export function hasTrainerPermission(role: UserRole): boolean {
  // Trainer veya daha yüksek rütbeliler
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.trainer;
}

export function hasStaffPermission(role: UserRole): boolean {
  // Herhangi bir personel (admin, trainer, visiting_trainer, staff)
  return ['admin', 'trainer', 'visiting_trainer', 'staff'].includes(role);
}

export function canManageStaff(role: UserRole): boolean {
  return role === 'admin'; // Sadece adminler personel yönetebilir
}

export function canManageClasses(role: UserRole): boolean {
  return ['admin', 'trainer'].includes(role); // Adminler ve eğitmenler sınıfları yönetebilir
}

export function canViewClasses(role: UserRole): boolean {
  // Adminler, eğitmenler, ziyaretçi eğitmenler ve personel sınıfları görebilir
  return ['admin', 'trainer', 'visiting_trainer', 'staff'].includes(role);
}

export function canAddMembers(role: UserRole): boolean {
  // Adminler ve personel üyeleri üye ekleyebilir
  return ['admin', 'staff'].includes(role);
}

// Rol görünen adları
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Administrator',
  trainer: 'Trainer',
  visiting_trainer: 'Visiting Trainer',
  staff: 'Staff Member', // 'staff' rolü için görünen ad eklendi
};

// Rol açıklamaları
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system access - can manage all users, classes, and settings',
  trainer: 'Can manage assigned classes and view schedules',
  visiting_trainer: 'Can view and manage only assigned classes with limited access',
  staff: 'Can add new members and view class schedules', // 'staff' rolü için açıklama eklendi
};