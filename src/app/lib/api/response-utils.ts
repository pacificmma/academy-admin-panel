// src/app/lib/api/response-utils.ts - ADD MISSING RESPONSE UTILITIES
// ============================================

import { NextResponse } from 'next/server';
import { ApiResponse } from '@/app/types/api';

// Standardized error response
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: message,
    ...(details && { details }),
  };

  return NextResponse.json(response, { status });
}

// Standardized success response
export function successResponse<T>(
  data?: T,
  message?: string,
  status: number = 200
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
  };

  return NextResponse.json(response, { status });
}

// Created response (201)
export function createdResponse<T>(
  data?: T,
  message: string = 'Resource created successfully'
): NextResponse {
  return successResponse(data, message, 201);
}

// Not found response (404)
export function notFoundResponse(resource: string = 'Resource'): NextResponse {
  return errorResponse(`${resource} not found`, 404);
}

// Bad request response (400)
export function badRequestResponse(message: string = 'Bad request'): NextResponse {
  return errorResponse(message, 400);
}

// Forbidden response (403)
export function forbiddenResponse(message: string = 'Access denied'): NextResponse {
  return errorResponse(message, 403);
}

// Unauthorized response (401)
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse {
  return errorResponse(message, 401);
}

// Conflict response (409)
export function conflictResponse(message: string = 'Resource conflict'): NextResponse {
  return errorResponse(message, 409);
}

// Validation error response (422)
export function validationErrorResponse(errors: string[] | string): NextResponse {
  const message = Array.isArray(errors) ? errors.join(', ') : errors;
  return errorResponse(`Validation failed: ${message}`, 422);
}