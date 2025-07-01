// src/app/types/class.ts (Updated)
export type ClassType = 'MMA' | 'BJJ' | 'Boxing' | 'Muay Thai' | 'Wrestling' | 'Judo' | 'Kickboxing' | 'Fitness' | 'Yoga' | 'Kids Martial Arts';

// Simplified RecurrencePattern based on user's example
export interface RecurrencePattern {
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc. (for recurring)
  durationValue?: number; // e.g., 4 (for recurring)
  durationUnit?: 'weeks' | 'months'; // e.g., 'weeks' (for recurring)
  // For single events, startDate is used directly from ClassFormData
  // For recurring, startDate is the first session date
}

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

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
  recurrence: RecurrencePattern; // Changed to new pattern
  price: number; // Price for single class or total package price
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // Removed description, location, requirements, tags, level from direct schedule fields based on user's instruction
  // These can still exist in ClassInstance if needed for specific instances
  description?: string; // Optional field for schedule description, not used in form
  location?: string; // Optional field for schedule location, not used in form
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
  location?: string; // Can be set per instance if different from schedule
  notes?: string; // Specific notes for this instance
  actualDuration?: number; // Actual duration if different from scheduled
  duration: number; // Duration of this specific instance
  createdAt: string;
  updatedAt: string;
  price?: number; // Price for this specific instance if overridden
  description?: string; // Description for this specific instance if overridden
}

// Updated ClassFormData to only include fields relevant for the form
export interface ClassFormData {
  name: string;
  classType: ClassType;
  instructorId: string;
  maxParticipants: number;
  duration: number; // Duration of each session in minutes
  startDate: string; // Initial start date (for single or first recurring)
  startTime: string; // Start time of each session
  price: number; // Price per session for single, or 0 for recurring if packagePrice is used
  // New recurrence fields based on user's sample ClassForm
  scheduleType: 'single' | 'recurring';
  daysOfWeek: number[]; // For recurring
  recurrenceDurationValue: number; // For recurring
  recurrenceDurationUnit: 'weeks' | 'months'; // For recurring
  packagePrice: number; // Total price for recurring package
}

export interface ClassFilters {
  classType?: ClassType;
  instructorId?: string;
  date?: string;
  status?: ClassStatus;
  level?: string; // Not used in form, but might exist in backend for filtering
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

// New type alias for schedule data without ID and timestamps, for cleaner passing to helper functions
export type ClassScheduleWithoutIdAndTimestamps = Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'>;

// Helper functions (adjusted for new recurrence structure)
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
    'Kids Martial Arts': '#ed64a6'
  };
  return colors[classType] || '#718096';
}

/**
 * Generates class instances based on a simplified recurrence pattern.
 * This version uses a start date and a duration in weeks/months, along with selected days of the week.
 */
export function generateRecurringClassDates(
  startDate: string,
  startTime: string,
  durationValue: number,
  durationUnit: 'weeks' | 'months',
  daysOfWeek: number[]
): Array<{ date: string; time: string }> {
  const classDates: Array<{ date: string; time: string }> = [];
  let currentSearchDate = startOfDay(new Date(startDate));
  const initialStartDate = startOfDay(new Date(startDate)); // Keep original start date for comparison

  let endDate: Date;
  if (durationUnit === 'weeks') {
    endDate = addWeeks(currentSearchDate, durationValue);
  } else { // 'months'
    endDate = addMonths(currentSearchDate, durationValue);
  }
  endDate = startOfDay(endDate); // Normalize end date to start of day

  // Sort daysOfWeek to ensure consistent iteration
  const sortedDaysOfWeek = daysOfWeek.sort((a, b) => a - b);

  // Iterate through a reasonable number of days to find occurrences within the duration
  // Add a buffer to ensure all occurrences up to endDate are captured
  const maxDaysToSearch = durationUnit === 'weeks' ? (durationValue * 7 + 10) : (durationValue * 30 + 10);

  for (let i = 0; i < maxDaysToSearch; i++) {
    const checkDate = addDays(initialStartDate, i); // Iterate forward from initial start date

    // Ensure checkDate is within the desired recurrence period
    if (isBefore(checkDate, initialStartDate) || isBefore(endDate, checkDate)) {
      continue;
    }

    const dayOfWeek = checkDate.getDay(); // 0 for Sunday, 1 for Monday etc.

    if (sortedDaysOfWeek.includes(dayOfWeek)) {
      classDates.push({
        date: formatFns(checkDate, 'yyyy-MM-dd'),
        time: startTime
      });
    }

    // Stop if we have passed the end date significantly, or if too many occurrences
    if (classDates.length > 365) break; // Arbitrary safety limit
  }

  return classDates.filter(d => {
      const date = startOfDay(new Date(d.date));
      return isBefore(date, addDays(endDate, 1)); // Ensure dates are not past the calculated end date
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
}

// These are not used in the simplified form but are kept for consistency with backend types if they exist there.
export const CLASS_TYPE_OPTIONS: ClassType[] = [
  'MMA', 'BJJ', 'Boxing', 'Muay Thai', 'Wrestling', 'Judo', 'Kickboxing', 'Fitness', 'Yoga', 'Kids Martial Arts'
];

export const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] as const;