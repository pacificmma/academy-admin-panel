// src/app/types/ui.ts - UI component types

import { ReactNode, ComponentType } from 'react';

// Button component types
export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

// Input component types
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

// Select component types
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
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
  placeholder?: string;
}

// Modal component types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
}

// Alert component types
export interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

// Table component types
export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  width?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  striped?: boolean;
  hoverable?: boolean;
}

// Loading component types
export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

// Badge component types
export interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Card component types
export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}