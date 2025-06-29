// middleware.ts - Enhanced Security
import { getSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, consider using Redis or external service)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

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

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
  loginMaxRequests: process.env.NODE_ENV === 'production' ? 5 : 50,
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🔧 Enhanced Middleware running for:', pathname);

  // Skip for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    console.log('⏭️ Skipping static file:', pathname);
    return addSecurityHeaders(NextResponse.next());
  }

  // Apply rate limiting
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    console.log('⚠️ Rate limit exceeded for:', getClientIP(request));
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
      },
    });
  }

  // Handle public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    console.log('🌐 Public route accessed:', pathname);
    
    // If user is already logged in and trying to access login page, redirect
    if (pathname === '/login') {
      const session = await getSession(request);
      if (session?.isActive) {
        console.log('🔄 User already logged in, redirecting from login');
        const redirectUrl = session.role === 'admin' ? '/dashboard' : '/classes';
        return addSecurityHeaders(NextResponse.redirect(new URL(redirectUrl, request.url)));
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Check authentication for protected routes
  console.log('🔐 Checking authentication for protected route:', pathname);
  const session = await getSession(request);

  if (!session) {
    console.log('❌ No session found, redirecting to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (!session.isActive) {
    console.log('❌ Session inactive, redirecting to login');
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear the invalid session cookie
    response.cookies.delete('pacific-mma-session');
    return addSecurityHeaders(response);
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
      return addSecurityHeaders(NextResponse.redirect(new URL('/classes', request.url)));
    }
  }

  // Root redirect - only redirect if at exactly "/"
  if (pathname === '/') {
    console.log('🏠 Root redirect for role:', session.role);
    const redirectTo = session.role === 'admin' ? '/dashboard' : '/classes';
    return addSecurityHeaders(NextResponse.redirect(new URL(redirectTo, request.url)));
  }

  console.log('✅ Access granted to:', pathname);
  return addSecurityHeaders(NextResponse.next());
}

// Add comprehensive security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Basic security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Content Security Policy (adjust based on your needs)
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.firebaseapp.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleapis.com https://*.firebaseapp.com https://firebasestorage.googleapis.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // HSTS Header for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  return response;
}

// Rate limiting check
function checkRateLimit(request: NextRequest): { allowed: boolean; resetTime: number } {
  const ip = getClientIP(request);
  const isLoginRequest = request.nextUrl.pathname === '/login';
  const maxRequests = isLoginRequest ? RATE_LIMIT.loginMaxRequests : RATE_LIMIT.maxRequests;
  
  const now = Date.now();
  const key = `${ip}-${isLoginRequest ? 'login' : 'general'}`;
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return { allowed: true, resetTime: now + RATE_LIMIT.windowMs };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false, resetTime: current.resetTime };
  }
  
  current.count++;
  return { allowed: true, resetTime: current.resetTime };
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  // Try different headers in order of preference
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIp = request.headers.get('x-real-ip');
  const xClientIp = request.headers.get('x-client-ip');
  
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  return xRealIp || xClientIp || 'unknown';
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

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