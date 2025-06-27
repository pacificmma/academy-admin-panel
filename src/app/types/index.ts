// src/app/types/index.ts - Main types export file

// Re-export all types from individual modules
export * from './auth';
export * from './staff';
export * from './api';
export * from './ui';
export * from './form';
export * from './navigation';
export * from './common';

// Commonly used type aliases
export type { UserRole } from './auth';
export type { StaffRecord, CreateStaffRequest } from './staff';
export type { ApiResponse, PaginatedResponse } from './api';
export type { ButtonProps, InputProps, SelectProps, ModalProps, AlertProps } from './ui';
export type { FormField, ValidationRule, FormState } from './form';
export type { MenuItemType, BreadcrumbItem } from './navigation';