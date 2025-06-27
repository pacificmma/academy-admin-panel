// src/app/types/navigation.ts - Navigation and menu types

import { ComponentType } from 'react';
import { UserRole } from './auth';

export interface MenuItemType {
  href: string;
  label: string;
  icon: ComponentType<any>;
  roles: UserRole[];
  children?: MenuItemType[];
  isActive?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ComponentType<any>;
}

export interface NavigationProps {
  menuItems: MenuItemType[];
  currentPath: string;
  userRole: UserRole;
  collapsed?: boolean;
  onToggle?: () => void;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: MenuItemType[];
  currentPath: string;
  userRole: UserRole;
}

export interface HeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  onMenuToggle?: () => void;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: ComponentType<any>;
  content: React.ReactNode;
  disabled?: boolean;
  badge?: string | number;
}

export interface TabsProps {
  items: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  orientation?: 'horizontal' | 'vertical';
}