//src/app/types/api.ts - ENSURE API TYPES EXIST
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    filters?: Record<string, any>;
    pagination?: {
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchQuery {
  q?: string;
  filters?: Record<string, any>;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  credentials?: RequestCredentials;
}

// ============================================
// FILE 4: src/app/types/class.ts - CLASS TYPES IF MISSING
// ============================================

export type ClassType = 
  | 'MMA' 
  | 'BJJ' 
  | 'Boxing' 
  | 'Muay Thai' 
  | 'Wrestling' 
  | 'Judo' 
  | 'Kickboxing' 
  | 'Fitness' 
  | 'Yoga' 
  | 'Kids Martial Arts';

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface ClassInstance {
  id: string;
  scheduleId?: string;
  name: string;
  classType: ClassType;
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
  duration: number;
  actualDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSchedule {
  id: string;
  name: string;
  classType: ClassType;
  instructorId: string;
  maxParticipants: number;
  duration: number;
  startDate: string;
  startTime: string;
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export function getClassTypeColor(classType: ClassType): string {
  const colors = {
    'MMA': '#ff6b6b',
    'BJJ': '#4ecdc4',
    'Boxing': '#45b7d1',
    'Muay Thai': '#f9ca24',
    'Wrestling': '#f0932b',
    'Judo': '#eb4d4b',
    'Kickboxing': '#6c5ce7',
    'Fitness': '#a29bfe',
    'Yoga': '#fd79a8',
    'Kids Martial Arts': '#fdcb6e'
  };
  return colors[classType] || '#95a5a6';
}