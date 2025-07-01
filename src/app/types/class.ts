// src/app/types/class.ts - Comprehensive Class Types
export type ClassType = 'MMA' | 'BJJ' | 'Boxing' | 'Muay Thai' | 'Wrestling' | 'Judo' | 'Kickboxing' | 'Fitness' | 'Yoga' | 'Kids Martial Arts';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number; // Every X days/weeks/months
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  endDate?: string; // ISO date string
  occurrences?: number; // Number of occurrences
}

export interface ClassSchedule {
  id: string;
  name: string;
  description?: string;
  classType: ClassType;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number; // Minutes
  startDate: string; // ISO date string
  startTime: string; // HH:MM format
  recurrence: RecurrencePattern;
  location?: string;
  requirements?: string[];
  price?: number;
  isActive: boolean;
  tags?: string[];
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  endTime: string; // HH:MM format
  maxParticipants: number;
  registeredParticipants: string[]; // Member IDs
  waitlist: string[]; // Member IDs
  status: ClassStatus;
  location?: string;
  notes?: string;
  actualDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassRegistration {
  id: string;
  classInstanceId: string;
  memberId: string;
  memberName: string;
  registeredAt: string;
  status: 'registered' | 'attended' | 'no_show' | 'cancelled';
  waitlistPosition?: number;
  notes?: string;
}

export interface ClassFormData {
  name: string;
  description?: string;
  classType: ClassType;
  instructorId: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
  recurrence: RecurrencePattern;
  location?: string;
  requirements?: string[];
  price?: number;
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';
  tags?: string[];
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

// Utility functions
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

export function getNextOccurrences(
  startDate: string,
  startTime: string,
  recurrence: RecurrencePattern,
  count: number = 10
): Array<{ date: string; time: string }> {
  const occurrences: Array<{ date: string; time: string }> = [];
  const start = new Date(startDate);
  
  if (recurrence.type === 'none') {
    return [{ date: startDate, time: startTime }];
  }
  
  let current = new Date(start);
  let occurrenceCount = 0;
  
  while (occurrences.length < count) {
    if (recurrence.type === 'weekly' && recurrence.daysOfWeek) {
      // For weekly recurrence with specific days
      for (let i = 0; i < 7; i++) {
        const dayOfWeek = current.getDay();
        if (recurrence.daysOfWeek.includes(dayOfWeek)) {
          if (current >= start) {
            occurrences.push({
              date: current.toISOString().split('T')[0],
              time: startTime
            });
          }
        }
        current.setDate(current.getDate() + 1);
        
        if (occurrences.length >= count) break;
      }
    } else {
      // For simple daily/weekly/monthly recurrence
      if (current >= start) {
        occurrences.push({
          date: current.toISOString().split('T')[0],
          time: startTime
        });
      }
      
      if (recurrence.type === 'daily') {
        current.setDate(current.getDate() + recurrence.interval);
      } else if (recurrence.type === 'weekly') {
        current.setDate(current.getDate() + (7 * recurrence.interval));
      } else if (recurrence.type === 'monthly') {
        current.setMonth(current.getMonth() + recurrence.interval);
      }
    }
    
    occurrenceCount++;
    if (recurrence.occurrences && occurrenceCount >= recurrence.occurrences) {
      break;
    }
    
    if (recurrence.endDate && current > new Date(recurrence.endDate)) {
      break;
    }
  }
  
  return occurrences;
}

export const CLASS_TYPE_OPTIONS: ClassType[] = [
  'MMA',
  'BJJ', 
  'Boxing',
  'Muay Thai',
  'Wrestling',
  'Judo',
  'Kickboxing',
  'Fitness',
  'Yoga',
  'Kids Martial Arts'
];

export const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] as const;