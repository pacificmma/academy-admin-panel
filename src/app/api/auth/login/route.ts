// src/app/api/auth/login/route.ts - Authentication API
import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { adminDb } from '@/app/lib/firebase/admin';
import { createSession, setSessionCookie } from '@/app/lib/auth/session';
import { auth } from '@/app/lib/firebase/config';


export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Check if user exists in staff collection using Admin SDK
    const staffDocRef = adminDb.collection('staff').doc(user.uid);
    const staffDoc = await staffDocRef.get();

    if (!staffDoc.exists) {
      // Sign out the user since they're not authorized
      await auth.signOut();
      return NextResponse.json(
        { error: 'User not found in staff directory' },
        { status: 404 }
      );
    }

    const staffData = staffDoc.data();

    // Check if user is active
    if (!staffData?.isActive) {
      await auth.signOut();
      return NextResponse.json(
        { error: 'Account has been deactivated. Please contact your administrator.' },
        { status: 403 }
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

    const sessionToken = await createSession(sessionData);

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
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
    console.error('Login error:', error);
    
    // Handle specific Firebase errors
    let errorMessage = 'Login failed';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email address';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later';
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = 'This account has been disabled';
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }
}