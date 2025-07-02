// src/app/types/dashboard.ts
export interface DashboardStats {
    totalMembers: number;
    activeMembers: number;
    totalStaff: number;
    activeStaff: number;
    totalClasses: number;
    upcomingClasses: number;
    completedClasses: number;
    totalMembershipPlans: number;
    activeMembershipPlans: number;
    totalDiscounts: number;
    activeDiscounts: number;
    totalParticipants: number;
    averageAttendance: number;
    lastUpdated: string;
    monthlyGrowth: {
      members: number;
      classes: number;
    };
  }
  
  export interface StatsCard {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ComponentType<any>;
    color: string;
    bgColor: string;
    growth: number;
    route: string;
  }
  
  export interface QuickAction {
    title: string;
    icon: React.ComponentType<any>;
    route: string;
    description: string;
  }
  
  export interface DashboardError {
    message: string;
    code?: string;
    timestamp: string;
  }