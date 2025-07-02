// src/app/api/members/route.ts - Member CRUD API operations
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminAuth, adminDb } from '@/app/lib/firebase/admin';
import { 
  createdResponse, 
  successResponse, 
  errorResponse, 
  conflictResponse, 
  badRequestResponse 
} from '@/app/lib/api/response-utils';
import { requireAdmin, RequestContext } from '@/app/lib/api/middleware';
import { MemberRecord, MemberFilters } from '@/app/types/member';
import bcrypt from 'bcryptjs';

// Validation schema for creating members
const createMemberSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  phoneNumber: z.string().optional(),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name is required'),
    phone: z.string().min(1, 'Emergency contact phone is required'),
    relationship: z.string().min(1, 'Emergency contact relationship is required'),
  }),
  awards: z.array(z.object({
    title: z.string().min(1, 'Award title is required'),
    awardedDate: z.string().min(1, 'Award date is required'),
  })).optional().default([]),
  parentId: z.string().optional(),
  assignMembership: z.object({
    membershipPlanId: z.string().min(1, 'Membership plan ID is required'),
    startDate: z.string().min(1, 'Start date is required'),
  }).optional(),
});

// GET /api/members - List members with filtering
export const GET = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const url = new URL(request.url);
    
    const filters: MemberFilters = {
      parentId: url.searchParams.get('parentId') || undefined,
      isActive: url.searchParams.get('isActive') ? 
        url.searchParams.get('isActive') === 'true' : undefined,
      searchTerm: url.searchParams.get('search') || undefined,
      hasParent: url.searchParams.get('hasParent') ? 
        url.searchParams.get('hasParent') === 'true' : undefined,
    };

    let query: any = adminDb.collection('members').orderBy('createdAt', 'desc');

    // Apply filters
    if (filters.parentId) {
      query = query.where('parentId', '==', filters.parentId);
    }
    if (filters.isActive !== undefined) {
      query = query.where('isActive', '==', filters.isActive);
    }
    if (filters.hasParent !== undefined) {
      if (filters.hasParent) {
        query = query.where('parentId', '!=', null);
      } else {
        query = query.where('parentId', '==', null);
      }
    }

    const snapshot = await query.get();
    let members: MemberRecord[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        uid: data.uid,
        email: data.email,
        fullName: data.fullName,
        address: data.address || undefined,
        phoneNumber: data.phoneNumber || undefined,
        emergencyContact: data.emergencyContact,
        awards: data.awards || [],
        parentId: data.parentId || undefined,
        isActive: data.isActive,
        role: 'member',
        classRegistrations: data.classRegistrations || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      });
    });

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      members = members.filter(member => 
        member.fullName.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower) ||
        member.phoneNumber?.toLowerCase().includes(searchLower) ||
        member.emergencyContact.name.toLowerCase().includes(searchLower)
      );
    }

    return successResponse({
      data: members,
      total: members.length
    }, `Successfully fetched ${members.length} members`);

  } catch (error) {
    return errorResponse('Failed to fetch members', 500);
  }
});

// POST /api/members - Create new member
export const POST = requireAdmin(async (request: NextRequest, context: RequestContext) => {
  try {
    const { session } = context;
    const body = await request.json();
    const validation = createMemberSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, { 
        validationErrors: validation.error.issues 
      });
    }

    const memberData = validation.data;

    // Check if email already exists in Firebase Authentication
    try {
      const existingFirebaseUser = await adminAuth.getUserByEmail(memberData.email);
      if (existingFirebaseUser) {
        return conflictResponse('Email already exists in authentication system');
      }
    } catch (error: any) {
      // getUserByEmail throws error if user not found, which is what we want
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Check if email exists in members collection
    const existingMember = await adminDb.collection('members')
      .where('email', '==', memberData.email)
      .get();

    if (!existingMember.empty) {
      return conflictResponse('Email already exists in member records');
    }

    // If parentId is provided, verify the parent exists
    if (memberData.parentId) {
      const parentDoc = await adminDb.collection('members').doc(memberData.parentId).get();
      if (!parentDoc.exists) {
        return badRequestResponse('Parent member not found');
      }
    }

    // Create Firebase Authentication user for member
    const firebaseUser = await adminAuth.createUser({
      email: memberData.email,
      password: memberData.password,
      displayName: memberData.fullName,
      emailVerified: true,
      disabled: false
    });

    // Hash password for backup storage
    const hashedPassword = await bcrypt.hash(memberData.password, 12);

    // Prepare member document data
    const newMemberData = {
      uid: firebaseUser.uid,
      email: memberData.email,
      fullName: memberData.fullName,
      address: memberData.address || null,
      phoneNumber: memberData.phoneNumber || null,
      emergencyContact: memberData.emergencyContact,
      awards: memberData.awards || [],
      parentId: memberData.parentId || null,
      isActive: true,
      role: 'member' as const,
      classRegistrations: [],
      password: hashedPassword, // Backup password storage
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.uid,
      updatedBy: session.uid,
    };

    // Create member document in Firestore using Firebase UID as document ID
    await adminDb.collection('members').doc(firebaseUser.uid).set(newMemberData);

    // If membership assignment is requested, create the membership
    let membershipCreated = null;
    if (memberData.assignMembership) {
      try {
        // Verify membership plan exists and is active
        const planDoc = await adminDb.collection('membershipPlans')
          .doc(memberData.assignMembership.membershipPlanId).get();
        
        if (!planDoc.exists) {
          // Warning: Member created but membership assignment failed
          return successResponse({
            id: firebaseUser.uid,
            ...newMemberData,
            createdAt: newMemberData.createdAt.toISOString(),
            updatedAt: newMemberData.updatedAt.toISOString(),
          }, 'Member created successfully but membership plan not found');
        }

        const planData = planDoc.data();
        if (planData?.status !== 'active') {
          return successResponse({
            id: firebaseUser.uid,
            ...newMemberData,
            createdAt: newMemberData.createdAt.toISOString(),
            updatedAt: newMemberData.updatedAt.toISOString(),
          }, 'Member created successfully but membership plan is not active');
        }

        // Calculate end date based on plan duration
        const startDate = new Date(memberData.assignMembership.startDate);
        const endDate = new Date(startDate);
        
        switch (planData.durationType) {
          case 'weeks':
            endDate.setDate(endDate.getDate() + planData.durationValue * 7);
            break;
          case 'months':
            endDate.setMonth(endDate.getMonth() + planData.durationValue);
            break;
          case 'years':
            endDate.setFullYear(endDate.getFullYear() + planData.durationValue);
            break;
          case 'days':
            endDate.setDate(endDate.getDate() + planData.durationValue);
            break;
        }

        // Create member membership
        const membershipData = {
          memberId: firebaseUser.uid,
          membershipPlanId: memberData.assignMembership.membershipPlanId,
          startDate: memberData.assignMembership.startDate,
          endDate: endDate.toISOString(),
          status: 'active' as const,
          paymentReference: `ADMIN_ASSIGNED_${Date.now()}`,
          paymentStatus: 'paid' as const,
          amount: planData.price,
          currency: planData.currency || 'USD',
          classesUsed: 0,
          maxClasses: planData.maxClasses || null,
          isUnlimited: planData.isUnlimited || false,
          createdBy: session.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const membershipRef = await adminDb.collection('memberMemberships').add(membershipData);
        membershipCreated = {
          id: membershipRef.id,
          ...membershipData,
          createdAt: membershipData.createdAt.toISOString(),
          updatedAt: membershipData.updatedAt.toISOString(),
        };

      } catch (membershipError) {
        // Member was created successfully, but membership assignment failed
        return successResponse({
          id: firebaseUser.uid,
          ...newMemberData,
          createdAt: newMemberData.createdAt.toISOString(),
          updatedAt: newMemberData.updatedAt.toISOString(),
        }, 'Member created successfully but membership assignment failed');
      }
    }

    // Return created member
    const createdMember: MemberRecord = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: newMemberData.email,
      fullName: newMemberData.fullName,
      address: newMemberData.address || undefined,
      phoneNumber: newMemberData.phoneNumber || undefined,
      emergencyContact: newMemberData.emergencyContact,
      awards: newMemberData.awards,
      parentId: newMemberData.parentId || undefined,
      isActive: newMemberData.isActive,
      role: 'member',
      classRegistrations: newMemberData.classRegistrations,
      createdAt: newMemberData.createdAt.toISOString(),
      updatedAt: newMemberData.updatedAt.toISOString(),
      createdBy: newMemberData.createdBy,
      updatedBy: newMemberData.updatedBy,
    };

    const successMessage = membershipCreated 
      ? 'Member and membership created successfully'
      : 'Member created successfully';

    return createdResponse({
      member: createdMember,
      membership: membershipCreated
    }, successMessage);

  } catch (error: any) {
    return errorResponse('Failed to create member', 500, { 
      details: error.message 
    });
  }
});