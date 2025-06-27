// middleware.ts - Fixed version
import { getSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { NextRequest, NextResponse } from 'next/server';


// Protected routes configuration
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  '/dashboard': ['admin'],
  '/staff': ['admin'],
  '/members': ['admin'],
  '/memberships': ['admin'],
  '/discounts': ['admin'],
  '/classes': ['admin', 'trainer', 'staff'],
  '/my-schedule': ['trainer', 'staff'],
};

// Public routes that don't need authentication
const PUBLIC_ROUTES = ['/login'];

// API routes that are protected
const PROTECTED_API_ROUTES = ['/api/staff', '/api/classes', '/api/members'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🔧 Middleware running for:', pathname);

  // Skip for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    console.log('⏭️ Skipping static file:', pathname);
    return NextResponse.next();
  }

  // Handle public routes - IMPORTANT: Check this first to avoid redirect loops
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('🌐 Public route accessed:', pathname);
    
    // If user is already logged in and trying to access login page, redirect
    if (pathname === '/login') {
      const session = await getSession(request);
      if (session?.isActive) {
        console.log('🔄 User already logged in, redirecting from login');
        const redirectUrl = session.role === 'admin' ? '/dashboard' : '/classes';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return NextResponse.next();
  }

  // Check authentication for protected routes
  console.log('🔐 Checking authentication for protected route:', pathname);
  const session = await getSession(request);

  if (!session) {
    console.log('❌ No session found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session.isActive) {
    console.log('❌ Session inactive, redirecting to login');
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear the invalid session cookie
    response.cookies.delete('pacific-mma-session');
    return response;
  }

  console.log('✅ Valid session found for user:', session.email, 'role:', session.role);

  // Check route permissions
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route => 
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const allowedRoles = PROTECTED_ROUTES[matchedRoute];
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      console.log('❌ Access denied for role:', session.role, 'to route:', matchedRoute);
      return NextResponse.redirect(new URL('/classes', request.url));
    }
  }

  // Root redirect - only redirect if at exactly "/"
  if (pathname === '/') {
    console.log('🏠 Root redirect for role:', session.role);
    const redirectTo = session.role === 'admin' ? '/dashboard' : '/classes';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  console.log('✅ Access granted to:', pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};