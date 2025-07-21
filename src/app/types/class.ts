// src/app/types/class.ts - TAMAMEN DÜZELTİLMİŞ VERSİYON
export interface ClassType {
  id: string;
  name: string;
  color: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  usageCount?: number;
}

// ClassStatus tipini ekledik
export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface ClassSchedule {
  id: string;
  name: string;
  classType: string;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number; // dakika cinsinden
  startDate: string; // ISO tarih dizisi
  startTime: string; // HH:MM formatı
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
  date: string; // ISO tarih dizisi
  startTime: string; // HH:MM formatı
  endTime: string; // HH:MM formatı
  maxParticipants: number;
  registeredParticipants: string[]; // Üye ID'lerinin dizisi
  waitlist: string[]; // Üye ID'lerinin dizisi
  status: ClassStatus; // Artık dışa aktarılan ClassStatus tipini kullanıyor
  location?: string;
  notes?: string;
  duration: number; // dakika cinsinden
  actualDuration?: number; // dakika cinsinden
  createdAt: string;
  updatedAt: string;
}

export interface ClassFormData {
  name: string;
  classType: string;
  instructorId: string;
  maxParticipants: number;
  duration: number; // dakika cinsinden
  startDate: string; // YYYY-AA-GG formatı
  startTime: string; // HH:MM formatı
  scheduleType: 'single' | 'recurring';
  daysOfWeek?: number[]; // 0-6 (Pazar-Cumartesi)
  recurrenceEndDate?: string; // YYYY-AA-GG formatı
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
  daysOfWeek?: number[]; // 0-6 (Pazar-Cumartesi) - İSTEĞE BAĞLI
  endDate?: string; // ISO tarih dizisi - İSTEĞE BAĞLI
  maxOccurrences?: number; // İSTEĞE BAĞLI
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
  location?: string; // İSTEĞE BAĞLI
  notes?: string; // İSTEĞE BAĞLI
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

// Tekrarlayan sınıf tarihlerini oluşturmak için yardımcı fonksiyon
export function generateRecurringClassDates(
  startDate: string,
  startTime: string,
  daysOfWeek: number[],
  endDate?: string,
  maxOccurrences?: number
): Array<{ date: string; time: string }> {
  const occurrences: Array<{ date: string; time: string }> = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + (365 * 24 * 60 * 60 * 1000)); // Varsayılan olarak 1 yıl
  
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

// Sınıf tipi rengini almak için yardımcı fonksiyon
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