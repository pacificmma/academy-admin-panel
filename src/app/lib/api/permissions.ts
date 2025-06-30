// src/app/lib/api/permissions.ts - Centralized Permission Management
import { UserRole } from '@/app/types';

// Permission matrix for all API operations
export const PERMISSIONS = {
  // Staff management
  staff: {
    create: ['admin'] as UserRole[],
    read: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    viewBasicInfo: ['admin', 'staff', 'trainer'] as UserRole[]
  },

  // Member management  
  members: {
    create: ['admin'] as UserRole[],
    read: ['admin', 'staff'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    viewBasicInfo: ['admin', 'staff', 'trainer'] as UserRole[]
  },

  // Membership plan management
  membershipPlans: {
    create: ['admin'] as UserRole[],
    read: ['admin', 'staff'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    viewPublic: ['admin', 'staff', 'trainer'] as UserRole[]
  },

  // Member membership instances
  memberMemberships: {
    create: ['admin'] as UserRole[],
    read: ['admin', 'staff'] as UserRole[],
    update: ['admin'] as UserRole[],
    cancel: ['admin'] as UserRole[],
    suspend: ['admin'] as UserRole[],
    reactivate: ['admin'] as UserRole[]
  },

  // Class management
  classes: {
    create: ['admin'] as UserRole[],
    read: ['admin', 'staff', 'trainer'] as UserRole[],
    update: ['admin'] as UserRole[],
    updateOwn: ['trainer'] as UserRole[], // Trainers can only update their assigned classes
    delete: ['admin'] as UserRole[],
    viewSchedule: ['admin', 'staff', 'trainer'] as UserRole[]
  },

  // Discount management
  discounts: {
    create: ['admin'] as UserRole[],
    read: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[]
  },

  // Analytics and reports
  analytics: {
    viewDashboard: ['admin'] as UserRole[],
    viewBasicStats: ['admin', 'staff'] as UserRole[],
    viewFinancials: ['admin'] as UserRole[],
    exportData: ['admin'] as UserRole[]
  },

  // System management
  system: {
    viewLogs: ['admin'] as UserRole[],
    manageBilling: ['admin'] as UserRole[],
    manageSettings: ['admin'] as UserRole[]
  }
} as const;

// Helper function to check if user has permission for a specific operation
export function hasPermission(userRole: UserRole, operation: keyof typeof PERMISSIONS, action: string): boolean {
  const modulePermissions = PERMISSIONS[operation] as Record<string, UserRole[]>;
  const requiredRoles = modulePermissions[action];
  
  if (!requiredRoles) {
    return false;
  }
  
  return requiredRoles.includes(userRole);
}

// Get all permissions for a user role
export function getRolePermissions(role: UserRole): Record<string, string[]> {
  const permissions: Record<string, string[]> = {};
  
  for (const [module, actions] of Object.entries(PERMISSIONS)) {
    permissions[module] = [];
    
    for (const [action, roles] of Object.entries(actions)) {
      if (roles.includes(role)) {
        permissions[module].push(action);
      }
    }
  }
  
  return permissions;
}

// Check if a trainer can modify a specific class
export async function canTrainerModifyClass(trainerId: string, classId: string): Promise<boolean> {
  // This would check if the trainer is assigned to the specific class
  // Implementation depends on your class-trainer relationship structure
  // For now, return true - you'll implement the actual logic based on your data model
  return true;
}