// middleware.ts - Route protection and authentication
import { getSession } from '@/app/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';


// Define protected routes and their required roles
const PROTECTED_ROUTES = {
  '/dashboard': ['admin'],
  '/staff': ['admin'],
  '/members': ['admin'],
  '/memberships': ['admin'],
  '/discounts': ['admin'],
  '/classes': ['admin', 'trainer', 'staff'],
  '/my-schedule': ['trainer', 'staff'],
} as const;

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

// API routes that require authentication
const PROTECTED_API_ROUTES = ['/api/staff', '/api/classes', '/api/members'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Handle public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // If user is already authenticated and accessing login, redirect to dashboard
    if (pathname === '/login') {
      const session = await getSession(request);
      if (session && session.isActive) {
        return NextResponse.redirect(new URL('/classes', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check authentication for all other routes
  const session = await getSession(request);

  // No session - redirect to login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is deactivated
  if (!session.isActive) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear the session cookie
    response.cookies.delete('pacific-mma-session');
    return response;
  }

  // Check API route permissions
  if (pathname.startsWith('/api/')) {
    if (PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))) {
      // API routes handle their own role-based authorization
      // Just ensure the user is authenticated and active
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Check page route permissions
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route => 
    pathname.startsWith(route)
  ) as keyof typeof PROTECTED_ROUTES;

  if (matchedRoute) {
    const allowedRoles = PROTECTED_ROUTES[matchedRoute];
    
    if (!allowedRoles.includes(session.role as any)) {
      // User doesn't have permission - redirect to classes (default page)
      return NextResponse.redirect(new URL('/classes', request.url));
    }
  }

  // Root path - redirect to appropriate dashboard
  if (pathname === '/') {
    if (session.role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/classes', request.url));
    }
  }

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
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};