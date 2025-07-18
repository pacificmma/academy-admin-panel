// src/app/types/class.ts - UPDATED WITH EXTENDED ClassFilters
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
  isActive: boolean; // Added missing property
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
  status?: 'all' | 'active' | 'inactive'; // Added missing property
  dateRange?: 'all' | 'today' | 'week' | 'month'; // Added missing property
}

export interface RecurrencePattern {
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  endDate?: string; // ISO date string
  maxOccurrences?: number;
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
  location?: string;
  notes?: string;
  isActive: boolean; // Added missing property
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
  const dates: Array<{ date: string; time: string }> = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year default
  const maxCount = maxOccurrences || 52; // 52 weeks default
  
  let currentDate = new Date(start);
  let count = 0;

  while (currentDate <= end && count < maxCount) {
    const dayOfWeek = currentDate.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      dates.push({
        date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD format
        time: startTime
      });
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
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
  };
  return colors[classType] || '#718096';
}