// src/app/api/auth/login/route.ts - Improved Authentication API
import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { adminDb } from '@/app/lib/firebase/admin';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';
import { auth } from '@/app/lib/firebase/config';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email and password are required' 
        },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Please enter a valid email address' 
        },
        { status: 400 }
      );
    }

    let user;
    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
    } catch (authError: any) {
      console.error('Firebase auth error:', authError);
      
      let errorMessage = 'Login failed';
      
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password';
          break;
        default:
          errorMessage = 'Authentication failed. Please check your credentials';
      }

      return NextResponse.json(
        { 
          success: false,
          error: errorMessage 
        },
        { status: 401 }
      );
    }

    // Check if user exists in staff collection using Admin SDK
    let staffDoc;
    try {
      const staffDocRef = adminDb.collection('staff').doc(user.uid);
      staffDoc = await staffDocRef.get();
    } catch (dbError) {
      console.error('Database error:', dbError);
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection error. Please try again' 
        },
        { status: 500 }
      );
    }

    if (!staffDoc.exists) {
      // Sign out the user since they're not authorized
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Access denied. You are not authorized to use this system' 
        },
        { status: 403 }
      );
    }

    const staffData = staffDoc.data();

    // Check if user is active
    if (!staffData?.isActive) {
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Your account has been deactivated. Please contact your administrator' 
        },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!staffData.role || !staffData.fullName) {
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Account setup incomplete. Please contact your administrator' 
        },
        { status: 422 }
      );
    }

    // Create session
    const sessionData = {
      uid: user.uid,
      email: user.email!,
      role: staffData.role,
      fullName: staffData.fullName,
      isActive: staffData.isActive,
    };

    let sessionToken;
    try {
      sessionToken = await createSession(sessionData);
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create session. Please try again' 
        },
        { status: 500 }
      );
    }

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        role: staffData.role,
        fullName: staffData.fullName,
      },
    });

    // Set HTTP-only cookie
    response.headers.set('Set-Cookie', setSessionCookie(sessionToken));

    return response;

  } catch (error: any) {
    console.error('Unexpected login error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred. Please try again' 
      },
      { status: 500 }
    );
  }
}