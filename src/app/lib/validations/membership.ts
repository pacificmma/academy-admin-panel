// src/app/lib/validations/membership.ts - Validation Schemas
import { z } from 'zod';

// Base membership plan schema
export const membershipPlanSchema = z.object({
  name: z.string()
    .min(3, 'Plan name must be at least 3 characters')
    .max(100, 'Plan name must be less than 100 characters')
    .trim(),
  
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  
  duration: z.enum([
    '1_week', 
    '1_month', 
    '3_months', 
    '6_months', 
    '1_year', 
    '18_months', 
    '2_years'
  ], {
    errorMap: () => ({ message: 'Invalid duration selected' })
  }),
  
  price: z.number()
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price must be less than $10,000'),
  
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .default('USD'),
  
  classTypes: z.array(z.enum([
    'mma', 
    'bjj', 
    'boxing', 
    'muay_thai', 
    'kickboxing', 
    'wrestling', 
    'judo', 
    'fitness', 
    'yoga', 
    'all_access'
  ]))
    .min(1, 'At least one class type must be selected')
    .max(10, 'Maximum 10 class types allowed'),
  
  status: z.enum(['active', 'inactive', 'draft'])
    .default('active'),
  
  maxClasses: z.number()
    .int()
    .min(1, 'Max classes must be at least 1')
    .optional(),
  
  isUnlimited: z.boolean()
    .default(false),
});

// Schema for creating membership plans
export const createMembershipPlanSchema = membershipPlanSchema.refine(
  (data) => {
    // If not unlimited, maxClasses should be defined
    if (!data.isUnlimited && !data.maxClasses) {
      return false;
    }
    return true;
  },
  {
    message: 'Max classes must be specified when plan is not unlimited',
    path: ['maxClasses'],
  }
);

// Schema for updating membership plans
export const updateMembershipPlanSchema = membershipPlanSchema.partial().refine(
  (data) => {
    // If isUnlimited is false and maxClasses is provided, it should be valid
    if (data.isUnlimited === false && data.maxClasses !== undefined && data.maxClasses < 1) {
      return false;
    }
    return true;
  },
  {
    message: 'Max classes must be at least 1 when specified',
    path: ['maxClasses'],
  }
);

// Member membership schema
export const memberMembershipSchema = z.object({
  memberId: z.string()
    .min(1, 'Member ID is required'),
  
  membershipPlanId: z.string()
    .min(1, 'Membership plan ID is required'),
  
  startDate: z.string()
    .datetime('Invalid start date format'),
  
  endDate: z.string()
    .datetime('Invalid end date format'),
  
  status: z.enum(['active', 'expired', 'cancelled', 'suspended'])
    .default('active'),
  
  paymentReference: z.string()
    .optional(),
  
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded'])
    .default('pending'),
  
  amount: z.number()
    .min(0, 'Amount must be non-negative'),
  
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .default('USD'),
  
  classesUsed: z.number()
    .int()
    .min(0, 'Classes used must be non-negative')
    .default(0),
  
  maxClasses: z.number()
    .int()
    .min(1)
    .optional(),
  
  isUnlimited: z.boolean()
    .default(false),
  
  cancellationReason: z.string()
    .optional(),
  
  suspensionReason: z.string()
    .optional(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

// Schema for creating member memberships
export const createMemberMembershipSchema = z.object({
  memberId: z.string()
    .min(1, 'Member ID is required'),
  
  membershipPlanId: z.string()
    .min(1, 'Membership plan ID is required'),
  
  startDate: z.string()
    .datetime('Invalid start date format'),
  
  paymentReference: z.string()
    .optional(),
  
  amount: z.number()
    .min(0, 'Amount must be non-negative'),
  
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .default('USD'),
});

// Search and filter schemas
export const membershipSearchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional(),
  classType: z.enum([
    'mma', 
    'bjj', 
    'boxing', 
    'muay_thai', 
    'kickboxing', 
    'wrestling', 
    'judo', 
    'fitness', 
    'yoga', 
    'all_access'
  ]).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  duration: z.enum([
    '1_week', 
    '1_month', 
    '3_months', 
    '6_months', 
    '1_year', 
    '18_months', 
    '2_years'
  ]).optional(),
});

export const memberMembershipSearchSchema = z.object({
  search: z.string().optional(),
  memberId: z.string().optional(),
  membershipPlanId: z.string().optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'suspended']).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  startDateFrom: z.string().datetime().optional(),
  startDateTo: z.string().datetime().optional(),
  endDateFrom: z.string().datetime().optional(),
  endDateTo: z.string().datetime().optional(),
});

// Type exports
export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
export type MemberMembershipInput = z.infer<typeof memberMembershipSchema>;
export type CreateMemberMembershipInput = z.infer<typeof createMemberMembershipSchema>;
export type MembershipSearchInput = z.infer<typeof membershipSearchSchema>;
export type MemberMembershipSearchInput = z.infer<typeof memberMembershipSearchSchema>;