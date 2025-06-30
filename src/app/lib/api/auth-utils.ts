// src/app/lib/api/auth-utils.ts - SECURE API Authentication Utilities
import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { UserRole } from '@/app/types';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  fullName: string;
}

// Extract and verify authorization token
async function extractAndVerifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  if (!token || token.length < 10) {
    return null;
  }
  
  try {
    await adminAuth.verifyIdToken(token);
    return token;
  } catch {
    return null;
  }
}

// Get user data from staff collection
async function getUserFromStaff(uid: string): Promise<AuthenticatedUser | null> {
  try {
    const staffDoc = await adminDb.collection('staff').doc(uid).get();
    
    if (!staffDoc.exists) {
      return null;
    }
    
    const staffData = staffDoc.data();
    if (!staffData?.isActive) {
      return null;
    }
    
    return {
      uid,
      email: staffData.email,
      role: staffData.role,
      isActive: staffData.isActive,
      fullName: `${staffData.firstName} ${staffData.lastName}`.trim()
    };
  } catch {
    return null;
  }
}

// Main authentication function
export async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const token = await extractAndVerifyToken(request);
    if (!token) return null;
    
    const decodedToken = await adminAuth.verifyIdToken(token);
    const user = await getUserFromStaff(decodedToken.uid);
    
    return user;
  } catch {
    return null;
  }
}

// Permission verification function
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

// Combined auth + permission check
export async function verifyPermission(
  request: NextRequest, 
  requiredRoles: UserRole[]
): Promise<AuthenticatedUser | null> {
  const user = await authenticateRequest(request);
  if (!user || !hasPermission(user.role, requiredRoles)) {
    return null;
  }
  return user;
}

// API Error responses
export const API_ERRORS = {
  UNAUTHORIZED: { error: 'Unauthorized access', status: 401 },
  FORBIDDEN: { error: 'Insufficient permissions', status: 403 },
  NOT_FOUND: { error: 'Resource not found', status: 404 },
  INVALID_INPUT: { error: 'Invalid input data', status: 400 },
  SERVER_ERROR: { error: 'Internal server error', status: 500 },
  RATE_LIMITED: { error: 'Too many requests', status: 429 }
} as const;