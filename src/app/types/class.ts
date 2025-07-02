// src/app/types/class.ts - UNIFIED AND COMPLETE VERSION
// ============================================

export type ClassType = 'MMA' | 'BJJ' | 'Boxing' | 'Muay Thai' | 'Wrestling' | 'Judo' | 'Kickboxing' | 'Fitness' | 'Yoga' | 'Kids Martial Arts' |  'All Access';

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

// Simplified RecurrencePattern
export interface RecurrencePattern {
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc. (for recurring)
}

export interface ClassSchedule {
  id: string;
  name: string;
  classType: ClassType;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number; // Minutes
  startDate: string; // ISO date string (for first occurrence)
  startTime: string; // HH:MM format
  recurrence: RecurrencePattern;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  location?: string;
}

export interface ClassInstance {
  id: string;
  scheduleId: string;
  name: string;
  classType: ClassType;
  instructorId: string;
  instructorName: string;
  date: string; // ISO date string
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format (calculated)
  maxParticipants: number;
  registeredParticipants: string[]; // Member IDs
  waitlist: string[]; // Member IDs
  status: ClassStatus;
  location?: string;
  notes?: string;
  actualDuration?: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface ClassFormData {
  name: string;
  classType: ClassType;
  instructorId: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
  scheduleType: 'single' | 'recurring';
  daysOfWeek: number[];
}

export interface ClassFilters {
  classType?: ClassType;
  instructorId?: string;
  date?: string;
  status?: ClassStatus;
  level?: string;
  searchTerm?: string;
}

export interface ClassStats {
  totalClasses: number;
  upcomingClasses: number;
  completedClasses: number;
  totalParticipants: number;
  averageAttendance: number;
  popularClassTypes: Array<{
    type: ClassType;
    count: number;
    color: string;
  }>;
}

// Type alias for schedule data without ID and timestamps
export type ClassScheduleWithoutIdAndTimestamps = Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'>;

// EXPORTED CONSTANTS AND UTILITIES
// ============================================

export const CLASS_TYPE_OPTIONS: ClassType[] = [
  'MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts', 'All Access'
];

export const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] as const;

// Helper functions
import { addDays, addWeeks, addMonths, startOfDay, isBefore, format as formatFns } from 'date-fns';

export function formatClassTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return `${startTime} - ${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export function getClassTypeColor(classType: ClassType): string {
  const colors: Record<ClassType, string> = {
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
    'All Access': 'black'
  };
  return colors[classType] || '#718096';
}

/**
 * Generates class instances based on recurrence pattern (fixed to ~1 year).
 */
export function generateRecurringClassDates(
  startDate: string,
  startTime: string,
  daysOfWeek: number[]
): Array<{ date: string; time: string }> {
  const classDates: Array<{ date: string; time: string }> = [];
  const initialStartDate = startOfDay(new Date(startDate));

  // Recur for approximately one year (365 days) from the initial start date
  const endDate = addDays(initialStartDate, 365); 

  // Sort daysOfWeek to ensure consistent iteration
  const sortedDaysOfWeek = daysOfWeek.sort((a, b) => a - b);

  // Iterate forward from initial start date to find occurrences within the one-year period
  for (let i = 0; ; i++) {
    const checkDate = addDays(initialStartDate, i);

    // Stop if we go beyond the calculated end date
    if (isBefore(endDate, checkDate)) {
      break;
    }

    const dayOfWeek = checkDate.getDay(); // 0 for Sunday, 1 for Monday etc.

    if (sortedDaysOfWeek.includes(dayOfWeek)) {
      classDates.push({
        date: formatFns(checkDate, 'yyyy-MM-dd'),
        time: startTime
      });
    }

    // Safety limit to prevent infinite loops in unexpected scenarios
    if (i > 400) break; 
  }

  return classDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}