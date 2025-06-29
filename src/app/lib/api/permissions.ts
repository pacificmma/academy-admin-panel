// src/app/lib/api/permissions.ts - Permission Matrix & Standards
import { UserRole } from '@/app/types';

// Permission matrix for different resources
export const PERMISSIONS = {
  // Staff Management
  staff: {
    read: ['admin'] as UserRole[],
    create: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    selfRead: ['admin', 'staff', 'trainer'] as UserRole[], // Can read own profile
    selfUpdate: ['admin', 'staff', 'trainer'] as UserRole[], // Can update own profile
  },

  // Member Management
  members: {
    read: ['admin', 'staff'] as UserRole[],
    create: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    viewBasicInfo: ['admin', 'staff', 'trainer'] as UserRole[], // Basic info for class assignments
  },

  // Membership Plans
  memberships: {
    read: ['admin'] as UserRole[],
    create: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    viewActive: ['admin', 'staff'] as UserRole[], // Active plans for member management
  },

  // Class Management
  classes: {
    read: ['admin', 'staff', 'trainer'] as UserRole[],
    create: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    updateAssigned: ['admin', 'trainer'] as UserRole[], // Trainer can update assigned classes
    readAssigned: ['trainer'] as UserRole[], // Trainer can read assigned classes
  },

  // My Classes (Trainer-specific)
  myClasses: {
    read: ['trainer', 'staff'] as UserRole[],
    update: ['trainer'] as UserRole[], // Update only assigned classes
  },

  // Payment & Financial
  payments: {
    read: ['admin'] as UserRole[],
    create: ['admin'] as UserRole[], // Manual payment entry
    viewReports: ['admin'] as UserRole[],
  },

  // Discounts & Promotions
  discounts: {
    read: ['admin'] as UserRole[],
    create: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
    delete: ['admin'] as UserRole[],
    viewActive: ['admin', 'staff'] as UserRole[], // Active discounts for member management
  },

  // Analytics & Reports
  analytics: {
    viewAll: ['admin'] as UserRole[],
    viewClassStats: ['admin', 'trainer'] as UserRole[], // Trainer can see their class stats
    viewMemberStats: ['admin', 'staff'] as UserRole[],
  },

  // System Settings
  settings: {
    read: ['admin'] as UserRole[],
    update: ['admin'] as UserRole[],
  },
} as const;

// Helper functions to check permissions
export class PermissionChecker {
  constructor(private userRole: UserRole, private userId: string) {}

  // Check if user has permission for a resource action
  can(resource: keyof typeof PERMISSIONS, action: string): boolean {
    const resourcePermissions = PERMISSIONS[resource] as any;
    const actionPermissions = resourcePermissions[action];
    
    if (!actionPermissions) {
      console.warn(`Permission action '${action}' not found for resource '${resource}'`);
      return false;
    }

    return actionPermissions.includes(this.userRole);
  }

  // Check if user can access their own resource
  canSelf(resource: keyof typeof PERMISSIONS, action: string, resourceUserId?: string): boolean {
    // Admin can always access everything
    if (this.userRole === 'admin') {
      return this.can(resource, action);
    }

    // Check if it's a self-action
    const selfAction = `self${action.charAt(0).toUpperCase() + action.slice(1)}`;
    const resourcePermissions = PERMISSIONS[resource] as any;
    const selfPermissions = resourcePermissions[selfAction];

    if (selfPermissions && selfPermissions.includes(this.userRole)) {
      // If no resourceUserId provided, assume it's self
      if (!resourceUserId) return true;
      // Check if accessing own resource
      return resourceUserId === this.userId;
    }

    // Fall back to regular permission check
    return this.can(resource, action);
  }

  // Check if user can access assigned resources (for trainers)
  canAssigned(resource: keyof typeof PERMISSIONS, action: string, isAssigned: boolean = false): boolean {
    // Admin can always access
    if (this.userRole === 'admin') {
      return this.can(resource, action);
    }

    // Check assigned-specific permissions
    const assignedAction = `${action}Assigned`;
    if (this.can(resource, assignedAction) && isAssigned) {
      return true;
    }

    // Fall back to regular permission check
    return this.can(resource, action);
  }

  // Bulk permission check
  canAny(resource: keyof typeof PERMISSIONS, actions: string[]): boolean {
    return actions.some(action => this.can(resource, action));
  }

  // Get all permissions for a resource
  getResourcePermissions(resource: keyof typeof PERMISSIONS): string[] {
    const resourcePermissions = PERMISSIONS[resource] as any;
    const userPermissions: string[] = [];

    for (const [action, roles] of Object.entries(resourcePermissions)) {
      if ((roles as UserRole[]).includes(this.userRole)) {
        userPermissions.push(action);
      }
    }

    return userPermissions;
  }
}

// Role hierarchy helper
export const ROLE_HIERARCHY = {
  admin: 3,
  staff: 2,
  trainer: 1,
} as const;

export function hasHigherRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isStaffOrHigher(role: UserRole): boolean {
  return hasHigherRole(role, 'staff');
}

export function isTrainerOrHigher(role: UserRole): boolean {
  return hasHigherRole(role, 'trainer');
}

// Permission decorators for cleaner code
export function RequirePermission(resource: keyof typeof PERMISSIONS, action: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // This would be used in class-based API handlers
      // For now, we'll use the functional approach
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

// Context-aware permission checking
export interface PermissionContext {
  userRole: UserRole;
  userId: string;
  resourceOwnerId?: string;
  isAssigned?: boolean;
  additionalData?: Record<string, any>;
}

export function checkPermission(
  resource: keyof typeof PERMISSIONS,
  action: string,
  context: PermissionContext
): { allowed: boolean; reason?: string } {
  const checker = new PermissionChecker(context.userRole, context.userId);

  // Admin always allowed
  if (context.userRole === 'admin') {
    return { allowed: true };
  }

  // Check self-access
  if (context.resourceOwnerId) {
    if (checker.canSelf(resource, action, context.resourceOwnerId)) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Cannot access other users' ${resource}` 
    };
  }

  // Check assigned access (for trainers)
  if (context.isAssigned !== undefined) {
    if (checker.canAssigned(resource, action, context.isAssigned)) {
      return { allowed: true };
    }
    return { 
      allowed: false, 
      reason: `Cannot access unassigned ${resource}` 
    };
  }

  // Regular permission check
  if (checker.can(resource, action)) {
    return { allowed: true };
  }

  return { 
    allowed: false, 
    reason: `Insufficient permissions for ${action} on ${resource}` 
  };
}

// Permission middleware factory
export function createPermissionMiddleware(
  resource: keyof typeof PERMISSIONS,
  action: string,
  options: {
    allowSelf?: boolean;
    checkAssigned?: boolean;
    resourceOwnerField?: string;
  } = {}
) {
  return (checker: PermissionChecker, context: any) => {
    const { allowSelf = false, checkAssigned = false, resourceOwnerField = 'uid' } = options;

    // Basic permission check
    if (checker.can(resource, action)) {
      return { allowed: true };
    }

    // Self-access check
    if (allowSelf && context[resourceOwnerField]) {
      if (checker.canSelf(resource, action, context[resourceOwnerField])) {
        return { allowed: true };
      }
    }

    // Assigned resource check (for trainers)
    if (checkAssigned && context.isAssigned !== undefined) {
      if (checker.canAssigned(resource, action, context.isAssigned)) {
        return { allowed: true };
      }
    }

    return {
      allowed: false,
      reason: `Insufficient permissions for ${action} on ${resource}`,
    };
  };
}