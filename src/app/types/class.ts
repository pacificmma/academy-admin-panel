// src/app/types/class.ts - Updated to support dynamic class types

// Change ClassType from enum to string
export type ClassType = string; // Now dynamic, no longer hardcoded enum

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

// Remove the hardcoded CLASS_TYPE_OPTIONS array
// export const CLASS_TYPE_OPTIONS: ClassType[] = [...]

// Add new interface for class type management
export interface ClassTypeDefinition {
  id: string;
  name: string;
  color?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  usageCount: number;
}

// Keep existing interfaces but update ClassType usage
export interface ClassSchedule {
  id: string;
  name: string;
  classType: ClassType; // Now string instead of enum
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
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
  classType: ClassType; // Now string instead of enum
  instructorId: string;
  instructorName: string;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  registeredParticipants: string[];
  waitlist: string[];
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
  classType: ClassType; // Now string instead of enum
  instructorId: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
  scheduleType: 'single' | 'recurring';
  daysOfWeek: number[];
}

export interface ClassFilters {
  classType?: ClassType; // Now string instead of enum
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
    type: ClassType; // Now string instead of enum
    count: number;
    color: string;
  }>;
}

// Simplified RecurrencePattern
export interface RecurrencePattern {
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc. (for recurring)
}

// Type alias for schedule data without ID and timestamps
export type ClassScheduleWithoutIdAndTimestamps = Omit<ClassSchedule, 'id' | 'createdAt' | 'updatedAt'>;

// Updated helper function - now dynamic
export function getClassTypeColor(classType: ClassType, classTypes?: ClassTypeDefinition[]): string {
  // If classTypes array is provided, use the color from there
  if (classTypes) {
    const typeDefinition = classTypes.find(ct => ct.name === classType);
    if (typeDefinition?.color) {
      return typeDefinition.color;
    }
  }
  
  // Fallback to default colors for common types
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
    'All Access': '#000000'
  };
  
  return defaultColors[classType] || '#718096';
}

// Helper functions remain the same
import { addDays, addWeeks, addMonths, startOfDay, isBefore, format as formatFns } from 'date-fns';

export function formatClassTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;

  return `${startTime} - ${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

/**
 * Generates class instances based on recurrence pattern (fixed to ~1 year).
 */
export function generateRecurringClassDates(
  startDate: string,
  startTime: string,
  duration: number,
  daysOfWeek: number[], // 0=Sunday, 1=Monday, etc.
  maxInstances: number = 52 // Default to ~1 year worth
): Array<{ date: string; startTime: string; endTime: string }> {
  const instances: Array<{ date: string; startTime: string; endTime: string }> = [];
  const start = startOfDay(new Date(startDate));
  const maxDate = addMonths(start, 12); // Generate for 1 year
  
  let currentDate = start;
  let instanceCount = 0;
  
  while (isBefore(currentDate, maxDate) && instanceCount < maxInstances) {
    const dayOfWeek = currentDate.getDay();
    
    if (daysOfWeek.includes(dayOfWeek)) {
      const dateStr = formatFns(currentDate, 'yyyy-MM-dd');
      const endTime = calculateEndTime(startTime, duration);
      
      instances.push({
        date: dateStr,
        startTime,
        endTime,
      });
      
      instanceCount++;
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return instances;
}

function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + duration;
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}