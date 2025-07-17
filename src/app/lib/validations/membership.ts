// src/app/lib/validations/membership.ts - Updated validation for dynamic class types

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

// Schema for creating membership plans
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

// Schema for class schedules with dynamic class types
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
  description: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
}).superRefine((data, ctx) => {
  if (data.scheduleType === 'recurring') {
    if (!data.daysOfWeek || data.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one day must be selected for recurring events',
        path: ['daysOfWeek'],
      });
    }
  }
});

// Schema for class instances with dynamic class types
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format'),
  
  paymentMethod: z.enum(['card', 'cash', 'bank_transfer'])
    .default('card'),
  
  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
  
  amount: z.number()
    .min(0, 'Amount must be non-negative'),
  
  currency: z.literal('USD'), // Fixed to USD only
});

// Search and filter schemas updated for dynamic class types
export const membershipSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  classType: z.string().optional(), // Dynamic string instead of enum
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  durationType: z.enum(['days', 'weeks', 'months', 'years']).optional(),
});

export const classSearchSchema = z.object({
  search: z.string().optional(),
  classType: z.string().optional(), // Dynamic string instead of enum
  instructorId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
});

// Type exports
export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
export type ClassScheduleInput = z.infer<typeof classScheduleSchema>;
export type ClassInstanceInput = z.infer<typeof classInstanceSchema>;
export type MemberMembershipInput = z.infer<typeof memberMembershipSchema>;
export type MembershipSearchInput = z.infer<typeof membershipSearchSchema>;
export type ClassSearchInput = z.infer<typeof classSearchSchema>;