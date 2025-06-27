import { getSession } from '@/app/lib/auth/session';
import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/app/types/staff';

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

const PUBLIC_ROUTES = ['/login', '/api/auth/login'];
const PROTECTED_API_ROUTES = ['/api/staff', '/api/classes', '/api/members'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip for static files and Next.js internals
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
    if (pathname === '/login') {
      const session = await getSession(request);
      if (session?.isActive) {
        return NextResponse.redirect(new URL('/classes', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check authentication
  const session = await getSession(request);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!session.isActive) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('pacific-mma-session');
    return response;
  }

  // Check route permissions
  const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route => 
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const allowedRoles = PROTECTED_ROUTES[matchedRoute];
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      return NextResponse.redirect(new URL('/classes', request.url));
    }
  }

  // Root redirect
  if (pathname === '/') {
    const redirectTo = session.role === 'admin' ? '/dashboard' : '/classes';
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};