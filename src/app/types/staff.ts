// src/types/index.ts - Core type definitions

export type UserRole = 'admin' | 'trainer' | 'staff';

// Authentication types
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

// Staff types
export interface StaffData {
  fullName: string;
  email: string;
  role: UserRole;
}

export interface StaffRecord extends StaffData {
  id: string;
  uid: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  deactivatedAt?: string;
}

export interface CreateStaffRequest extends StaffData {
  password: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// UI Component types
export interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
  }

export interface InputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

// Table types
export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FormField {
  name: string;
  label: string;
  type: string;
  validation?: ValidationRule;
  placeholder?: string;
  options?: SelectOption[];
}

// Navigation types
export interface MenuItemType {
  href: string;
  label: string;
  icon: React.ComponentType<any>;
  roles: UserRole[];
  children?: MenuItemType[];
}

// Permission types
export interface PermissionCheck {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
}

// Event types
export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  details?: Record<string, any>;
}