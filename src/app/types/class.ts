// src/app/types/class.ts - Updated with dynamic class types
export interface ClassSchedule {
  id: string;
  name: string;
  classType: string; // Now dynamically created
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number; // in minutes
  startDate: string; // ISO date string
  startTime: string; // HH:MM format
  recurrence: RecurrencePattern;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface ClassInstance {
  id: string;
  scheduleId: string;
  name: string;
  classType: string; // Now dynamically created
  instructorId: string;
  instructorName: string;
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  maxParticipants: number;
  registeredParticipants: string[]; // Array of member IDs
  waitlist: string[]; // Array of member IDs
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  location?: string;
  notes?: string;
  duration: number; // in minutes
  actualDuration?: number; // in minutes
  createdAt: string;
  updatedAt: string;
}

export interface ClassFormData {
  name: string;
  classType: string; // Now dynamically created
  instructorId: string;
  maxParticipants: number;
  duration: number; // in minutes
  startDate: string; // YYYY-MM-DD format
  startTime: string; // HH:MM format
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  recurrenceEndDate?: string; // YYYY-MM-DD format
  location?: string;
  notes?: string;
}

export interface ClassFilters {
  classType?: string;
  instructorId?: string;
  date?: string;
  searchTerm?: string;
}

export interface RecurrencePattern {
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  endDate?: string; // ISO date string
  maxOccurrences?: number;
}

export interface ClassScheduleWithoutIdAndTimestamps {
  name: string;
  classType: string; // Now dynamically created
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
  recurrence: RecurrencePattern;
  location?: string;
  notes?: string;
  createdBy: string;
  updatedBy?: string;
}

export interface ClassStats {
  totalSchedules: number;
  totalInstances: number;
  upcomingInstances: number;
  completedInstances: number;
  cancelledInstances: number;
  averageParticipants: number;
  totalParticipants: number;
  classTypeDistribution: Record<string, number>;
  instructorDistribution: Record<string, number>;
}

// Helper function to generate recurring class dates
export function generateRecurringClassDates(
  startDate: string,
  daysOfWeek: number[],
  endDate?: string,
  maxOccurrences?: number
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
  
  let currentDate = new Date(start);
  let occurrenceCount = 0;

  while (currentDate <= end && (!maxOccurrences || occurrenceCount < maxOccurrences)) {
    if (daysOfWeek.includes(currentDate.getDay())) {
      dates.push(currentDate.toISOString().split('T')[0]);
      occurrenceCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// Helper function to get class type color (now handled dynamically)
export function getDefaultClassTypeColor(classType: string): string {
  const defaultColors: Record<string, string> = {
    'MMA': '#e53e3e',
    'BJJ': '#805ad5',
    'Boxing': '#d69e2e',
    'Muay Thai': '#e53e3e',
    'Wrestling': '#38a169',
    'Judo': '#3182ce',
    'Kickboxing': '#ed8936',
    'Fitness': '#4299e1',
    'Yoga': '#48bb78',
    'Kids Martial Arts': '#ed64a6',
  };
  
  return defaultColors[classType] || '#718096';
}

// Class type interface for dynamic management
export interface ClassType {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  usageCount?: number;
}