// src/app/types/class.ts - Kapsamlı Ders Tipleri (Güncellendi)
export type ClassType = 'MMA' | 'BJJ' | 'Boxing' | 'Muay Thai' | 'Wrestling' | 'Judo' | 'Kickboxing' | 'Fitness' | 'Yoga' | 'Kids Martial Arts';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export type ClassStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface RecurrencePattern {
  type: RecurrenceType;
  interval: number; // Her X gün/hafta/ay
  daysOfWeek?: number[]; // 0=Pazar, 1=Pazartesi, vb.
  endDate?: string; // ISO tarih dizesi
  occurrences?: number; // Tekrarlama sayısı
}

export interface ClassSchedule {
  id: string;
  name: string;
  description?: string;
  classType: ClassType;
  instructorId: string;
  instructorName: string;
  maxParticipants: number;
  duration: number; // Dakika
  startDate: string; // ISO tarih dizesi
  startTime: string; // HH:MM formatı
  recurrence: RecurrencePattern;
  location?: string; // İsteğe bağlı yapıldı
  requirements?: string[]; // İsteğe bağlı yapıldı
  price?: number; // İsteğe bağlı yapıldı
  isActive: boolean;
  tags?: string[]; // İsteğe bağlı yapıldı
  level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'; // İsteğe bağlı yapıldı
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassInstance {
  description: string | undefined;
  id: string;
  scheduleId: string;
  name: string;
  classType: ClassType;
  instructorId: string;
  instructorName: string;
  date: string; // ISO tarih dizesi
  startTime: string; // HH:MM formatı
  endTime: string; // HH:MM formatı
  maxParticipants: number;
  registeredParticipants: string[]; // Üye ID'leri
  waitlist: string[]; // Üye ID'leri
  status: ClassStatus;
  location?: string;
  notes?: string;
  actualDuration?: number;
  duration: number; // EKLENDİ: ClassInstance'a açıkça duration eklendi
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

// Yardımcı fonksiyonlar
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
  start.setHours(0, 0, 0, 0); // Karşılaştırma için günün başlangıcına normalize et

  if (recurrence.type === 'none') {
    return [{ date: startDate, time: startTime }];
  }

  let current = new Date(start);
  let occurrenceCount = 0;

  while (occurrences.length < count && (!recurrence.occurrences || occurrenceCount < recurrence.occurrences) && (!recurrence.endDate || current <= new Date(recurrence.endDate))) {
    if (recurrence.type === 'weekly' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      const startOfWeek = new Date(current);
      startOfWeek.setDate(current.getDate() - current.getDay() + (current.getDay() === 0 ? -6 : 1)); // Mevcut haftanın Pazartesi'sine ayarla

      let addedThisWeek = false;
      for (let i = 0; i < 7; i++) {
        const dayToAdd = new Date(startOfWeek);
        dayToAdd.setDate(startOfWeek.getDate() + i);

        if (recurrence.daysOfWeek.includes(dayToAdd.getDay()) && dayToAdd >= start && (!recurrence.endDate || dayToAdd <= new Date(recurrence.endDate))) {
          occurrences.push({
            date: dayToAdd.toISOString().split('T')[0],
            time: startTime
          });
          addedThisWeek = true;
          if (occurrences.length >= count) break;
        }
      }
      if (addedThisWeek) { // Belirli aralıklarla ilerle (haftalar)
        current.setDate(current.getDate() + (7 * recurrence.interval));
      } else { // Mevcut haftada eşleşen gün yoksa, bir sonraki olası başlangıcı bulmak için bir gün ilerle.
        current.setDate(current.getDate() + 1);
      }
    } else { // Günlük, Aylık veya haftalık olmayan tekrarlama
      if (current >= start) {
        occurrences.push({
          date: current.toISOString().split('T')[0],
          time: startTime
        });
      }

      if (recurrence.type === 'daily') {
        current.setDate(current.getDate() + recurrence.interval);
      } else if (recurrence.type === 'monthly') {
        current.setMonth(current.getMonth() + recurrence.interval);
      }
    }

    occurrenceCount++;
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