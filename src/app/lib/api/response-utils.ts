// src/app/lib/api/response-utils.ts - Standardized API Response Utilities
import { NextResponse } from 'next/server';

// Standard API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

// Success response builders
export function successResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message
  } satisfies ApiSuccessResponse<T>);
}

export function createdResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message
  } satisfies ApiSuccessResponse<T>, { status: 201 });
}

// Error response builders
export function errorResponse(error: string, status: number = 500, details?: any): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    details
  } satisfies ApiErrorResponse, { status });
}

export function unauthorizedResponse(): NextResponse {
  return errorResponse('Unauthorized access', 401);
}

export function forbiddenResponse(): NextResponse {
  return errorResponse('Insufficient permissions', 403);
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse(`${resource} not found`, 404);
}

export function badRequestResponse(message: string): NextResponse {
  return errorResponse(message, 400);
}

export function validationErrorResponse(errors: string[]): NextResponse {
  return errorResponse('Validation failed', 400, { validationErrors: errors });
}

// Safe JSON parsing
export async function safeParseJson(request: Request): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const body = await request.json();
    return { success: true, data: body };
  } catch (error) {
    return { 
      success: false, 
      error: 'Invalid JSON format' 
    };
  }
}

// Input sanitization
export function sanitizeString(input: any): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, 1000); // Prevent extremely long strings
}

export function sanitizeEmail(input: any): string {
  if (typeof input !== 'string') return '';
  return input.toLowerCase().trim().slice(0, 255);
}

export function sanitizeNumber(input: any, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number {
  const num = Number(input);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}