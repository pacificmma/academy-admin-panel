// src/app/lib/validations/membership.ts - COMPLETELY FIXED VALIDATIONS

import { z } from 'zod';

// Base membership plan schema with dynamic class types
export const membershipPlanSchema = z.object({
  name: z.string()
    .min(3, 'Plan name must be at least 3 characters')
    .max(100, 'Plan name must be less than 100 characters')
    .trim(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  durationValue: z.number()
    .int()
    .min(1, 'Duration value must be at least 1')
    .max(999, 'Duration value must be less than 999'),
  
  durationType: z.enum(['days', 'weeks', 'months', 'years'], {
    errorMap: () => ({ message: 'Invalid duration type selected' })
  }),
  
  price: z.number()
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price must be less than $10,000'),
  
  currency: z.literal('USD'), // Fixed to USD only
  
  classTypes: z.array(z.string().min(1, 'Class type name cannot be empty'))
    .min(1, 'At least one class type must be selected')
    .max(20, 'Maximum 20 class types allowed'),
  
  status: z.enum(['active', 'inactive', 'draft'])
    .default('active'),
});

// Schema for creating membership plans with custom validation
export const createMembershipPlanSchema = membershipPlanSchema.refine(
  (data) => {
    // Validate that class types are not just whitespace
    const validClassTypes = data.classTypes.filter(ct => ct.trim().length > 0);
    return validClassTypes.length > 0;
  },
  {
    message: 'At least one valid class type must be provided',
    path: ['classTypes'],
  }
);

// Schema for updating membership plans
export const updateMembershipPlanSchema = membershipPlanSchema.partial();

// FIXED: Class schedules schema with proper validation
export const classScheduleSchema = z.object({
  name: z.string().min(3).max(100),
  classType: z.string().min(1, 'Class type is required'), // Dynamic string instead of enum
  instructorId: z.string().min(1),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  scheduleType: z.enum(['single', 'recurring']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurrenceEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
}).refine((data) => {
  if (data.scheduleType === 'recurring') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      return false;
    }
  }
  return true;
}, {
  message: 'At least one day must be selected for recurring events',
  path: ['daysOfWeek'],
});

// FIXED: Class instances schema with proper validation
export const classInstanceSchema = z.object({
  name: z.string().min(3).max(100),
  classType: z.string().min(1, 'Class type is required'), // Dynamic string instead of enum
  instructorId: z.string().min(1),
  maxParticipants: z.number().int().min(1).max(100),
  duration: z.number().int().min(15).max(240),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Member membership schema
export const memberMembershipSchema = z.object({
  memberId: z.string()
    .min(1, 'Member ID is required'),
  
  membershipPlanId: z.string()
    .min(1, 'Membership plan ID is required'),
  
  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format, use YYYY-MM-DD'),
  
  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format, use YYYY-MM-DD')
    .optional(),
  
  paymentStatus: z.enum(['pending', 'paid', 'overdue', 'cancelled'])
    .default('pending'),
  
  autoRenew: z.boolean()
    .default(false),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
}).refine((data) => {
  if (data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    return endDate > startDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Discount code schema
export const discountCodeSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(20, 'Code must be less than 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain uppercase letters, numbers, underscore and dash')
    .trim(),
  
  type: z.enum(['percentage', 'fixed_amount'], {
    errorMap: () => ({ message: 'Discount type must be percentage or fixed amount' })
  }),
  
  value: z.number()
    .min(0.01, 'Discount value must be greater than 0'),
  
  description: z.string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  
  validFrom: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  
  validUntil: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  
  usageLimit: z.number()
    .int()
    .min(1, 'Usage limit must be at least 1')
    .max(10000, 'Usage limit must be less than 10,000')
    .optional(),
  
  minimumPurchase: z.number()
    .min(0, 'Minimum purchase cannot be negative')
    .optional(),
  
  applicableToPlans: z.array(z.string())
    .min(1, 'At least one membership plan must be selected')
    .optional(),
  
  isActive: z.boolean()
    .default(true),
}).refine((data) => {
  // Validate percentage discount
  if (data.type === 'percentage' && data.value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot be greater than 100%',
  path: ['value'],
}).refine((data) => {
  // Validate date range
  const validFrom = new Date(data.validFrom);
  const validUntil = new Date(data.validUntil);
  return validUntil > validFrom;
}, {
  message: 'Valid until date must be after valid from date',
  path: ['validUntil'],
});

// Member registration schema
export const memberRegistrationSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(100, 'Email must be less than 100 characters'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(50, 'Password must be less than 50 characters'),
  
  confirmPassword: z.string(),
  
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .trim(),
  
  phone: z.string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
    .optional(),
  
  dateOfBirth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
  
  address: z.object({
    street: z.string().max(100).optional(),
    city: z.string().max(50).optional(),
    state: z.string().max(50).optional(),
    zipCode: z.string().max(10).optional(),
    country: z.string().max(50).optional(),
  }).optional(),
  
  emergencyContact: z.object({
    name: z.string()
      .min(2, 'Emergency contact name must be at least 2 characters')
      .max(100, 'Emergency contact name must be less than 100 characters'),
    phone: z.string()
      .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid emergency contact phone number'),
    relationship: z.string()
      .min(2, 'Relationship must be at least 2 characters')
      .max(50, 'Relationship must be less than 50 characters'),
  }),
  
  medicalInfo: z.object({
    conditions: z.string().max(500).optional(),
    medications: z.string().max(500).optional(),
    allergies: z.string().max(500).optional(),
    emergencyMedicalInfo: z.string().max(500).optional(),
  }).optional(),
  
  waiverSigned: z.boolean()
    .refine(val => val === true, 'Waiver must be signed'),
  
  marketingOptIn: z.boolean()
    .default(false),
}).refine((data) => {
  return data.password === data.confirmPassword;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});