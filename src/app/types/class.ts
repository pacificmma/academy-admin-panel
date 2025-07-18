// src/app/types/class.ts - FIXED VERSION WITH getClassTypeColor
export interface ClassSchedule {
  id: string;
  name: string;
  classType: string;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number; // in minutes
  startDate: string; // ISO date string
  startTime: string; // HH:MM format
  recurrence: RecurrencePattern;
  location?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface ClassInstance {
  id: string;
  scheduleId: string;
  name: string;
  classType: string;
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
  classType: string;
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
  status?: 'all' | 'active' | 'inactive';
  dateRange?: 'all' | 'today' | 'week' | 'month';
}

export interface RecurrencePattern {
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) - OPTIONAL
  endDate?: string; // ISO date string - OPTIONAL
  maxOccurrences?: number; // OPTIONAL
}
export interface ClassScheduleWithoutIdAndTimestamps {
  name: string;
  classType: string;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
  recurrence: RecurrencePattern;
  location?: string; // OPTIONAL
  notes?: string; // OPTIONAL
  isActive: boolean;
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
  startTime: string,
  daysOfWeek: number[],
  endDate?: string,
  maxOccurrences?: number
): Array<{ date: string; time: string }> {
  const occurrences: Array<{ date: string; time: string }> = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + (365 * 24 * 60 * 60 * 1000)); // Default to 1 year
  
  let currentDate = new Date(start);
  let count = 0;
  
  while (currentDate <= end && (!maxOccurrences || count < maxOccurrences)) {
    if (daysOfWeek.includes(currentDate.getDay())) {
      occurrences.push({
        date: currentDate.toISOString().split('T')[0],
        time: startTime
      });
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return occurrences;
}

// Helper function to get class type color
export function getClassTypeColor(classType: string): string {
  const colors: Record<string, string> = {
    'MMA': '#e53e3e',
    'BJJ': '#805ad5',
    'Boxing': '#d69e2e',
    'Muay Thai': '#38a169',
    'Wrestling': '#3182ce',
    'Judo': '#ed8936',
    'Kickboxing': '#4299e1',
    'Fitness': '#48bb78',
    'Yoga': '#ed64a6',
    'Kids Martial Arts': '#718096',
    'All Access': '#2d3748',
  };
  return colors[classType] || '#718096';
}