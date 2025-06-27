// src/app/api/auth/login/route.ts - TypeScript Fixed
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚀 API Route /api/auth/login called');
  
  try {
    // Environment variables check
    console.log('🔍 Environment Variables Check:');
    console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ MISSING');
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING');
    console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ SET' : '❌ MISSING');
    console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ SET (length: ' + (process.env.FIREBASE_PRIVATE_KEY?.length || 0) + ')' : '❌ MISSING');
    console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ SET' : '❌ MISSING');

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('📥 Request body parsed:', { email: body.email, password: '***' });
    } catch (parseError: unknown) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
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
      console.log('❌ Invalid email format:', email);
      return NextResponse.json(
        { 
          success: false,
          error: 'Please enter a valid email address' 
        },
        { status: 400 }
      );
    }

    console.log('✅ Basic validation passed');

    // Try to import Firebase modules
    let signInWithEmailAndPassword, auth, adminDb, createSession, setSessionCookie;
    
    try {
      console.log('📦 Importing Firebase Auth...');
      const firebaseAuth = await import('firebase/auth');
      signInWithEmailAndPassword = firebaseAuth.signInWithEmailAndPassword;
      console.log('✅ Firebase Auth imported');

      console.log('📦 Importing Firebase config...');
      const firebaseConfig = await import('@/app/lib/firebase/config');
      auth = firebaseConfig.auth;
      console.log('✅ Firebase config imported');

      console.log('📦 Importing Firebase Admin...');
      const firebaseAdmin = await import('@/app/lib/firebase/admin');
      adminDb = firebaseAdmin.adminDb;
      console.log('✅ Firebase Admin imported');

      console.log('📦 Importing session utils...');
      const sessionUtils = await import('@/app/lib/auth/session');
      createSession = sessionUtils.createSession;
      setSessionCookie = sessionUtils.setSessionCookie;
      console.log('✅ Session utils imported');

    } catch (importError: unknown) {
      const errorMessage = importError instanceof Error ? importError.message : 'Unknown import error';
      console.error('❌ Failed to import modules:', importError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Server configuration error: ' + errorMessage 
        },
        { status: 500 }
      );
    }

    // Try Firebase authentication
    let user;
    try {
      console.log('🔐 Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      console.log('✅ Firebase authentication successful:', user.uid);
    } catch (authError: unknown) {
      console.error('❌ Firebase auth error:', authError);
      
      let errorMessage = 'Login failed';
      
      if (authError && typeof authError === 'object' && 'code' in authError) {
        const firebaseError = authError as { code: string; message: string };
        
        switch (firebaseError.code) {
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
            errorMessage = 'Authentication failed: ' + firebaseError.message;
        }
      } else if (authError instanceof Error) {
        errorMessage = 'Authentication failed: ' + authError.message;
      }

      return NextResponse.json(
        { 
          success: false,
          error: errorMessage 
        },
        { status: 401 }
      );
    }

    // Check staff collection
    let staffDoc;
    try {
      console.log('📄 Checking staff collection for user:', user.uid);
      const staffDocRef = adminDb.collection('staff').doc(user.uid);
      staffDoc = await staffDocRef.get();
      console.log('📄 Staff doc exists:', staffDoc.exists);
    } catch (dbError: unknown) {
      const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown database error';
      console.error('❌ Database error:', dbError);
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Database connection error: ' + errorMessage 
        },
        { status: 500 }
      );
    }

    if (!staffDoc.exists) {
      console.log('❌ User not found in staff collection');
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
    console.log('📄 Staff data:', { ...staffData, password: undefined });

    // Check if user is active
    if (!staffData?.isActive) {
      console.log('❌ User account is inactive');
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
      console.log('❌ Incomplete staff data');
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
      console.log('🎫 Creating session...');
      sessionToken = await createSession(sessionData);
      console.log('✅ Session created successfully');
    } catch (sessionError: unknown) {
      const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown session error';
      console.error('❌ Session creation error:', sessionError);
      await auth.signOut();
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to create session: ' + errorMessage 
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
    console.log('✅ Login process completed successfully');

    return response;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    console.error('❌ Unexpected login error:', error);
    console.error('❌ Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred: ' + errorMessage 
      },
      { status: 500 }
    );
  }
}