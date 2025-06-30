// middleware.ts - Enhanced Security with Consistent Session Management (FIXED)
import { getSession } from '@/app/lib/auth/session';
import { UserRole } from '@/app/types';
import { NextRequest, NextResponse } from 'next/server';

// Rate limiting store (in production, use Redis or Vercel KV)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Protected page routes configuration
const PROTECTED_PAGE_ROUTES: Record<string, UserRole[]> = {
  '/dashboard': ['admin'],
  '/staff': ['admin'],
  '/members': ['admin'],
  '/memberships': ['admin'],
  '/discounts': ['admin'],
  '/classes': ['admin', 'trainer', 'staff'],
  '/my-schedule': ['trainer', 'staff'],
};

// API routes permissions configuration
const API_PERMISSIONS: Record<string, { methods: Record<string, UserRole[]> }> = {
  '/api/staff': {
    methods: {
      'GET': ['admin'],
      'POST': ['admin'],
      'PUT': ['admin'],
      'DELETE': ['admin'],
    }
  },
  '/api/members': {
    methods: {
      'GET': ['admin', 'staff'],
      'POST': ['admin'],
      'PUT': ['admin'],
      'DELETE': ['admin'],
    }
  },
  '/api/memberships': {
    methods: {
      'GET': ['admin'],
      'POST': ['admin'],
      'PUT': ['admin'],
      'DELETE': ['admin'],
    }
  },
  '/api/classes': {
    methods: {
      'GET': ['admin', 'trainer', 'staff'],
      'POST': ['admin'],
      'PUT': ['admin', 'trainer'],
      'DELETE': ['admin'],
    }
  },
  '/api/my-classes': {
    methods: {
      'GET': ['trainer', 'staff'],
      'PUT': ['trainer'],
    }
  },
  '/api/discounts': {
    methods: {
      'GET': ['admin'],
      'POST': ['admin'],
      'PUT': ['admin'],
      'DELETE': ['admin'],
    }
  },
};

// Public routes that don't need authentication
const PUBLIC_ROUTES = ['/login'];

// Auth-excluded API routes (login, logout, session)
const AUTH_EXCLUDED_API_ROUTES = ['/api/auth/'];

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
  loginMaxRequests: process.env.NODE_ENV === 'production' ? 5 : 50,
  apiMaxRequests: process.env.NODE_ENV === 'production' ? 200 : 2000,
};

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || real || 'unknown';
}

// Get rate limit based on route type
function getRateLimit(pathname: string): number {
  if (pathname === '/login') return RATE_LIMIT.loginMaxRequests;
  if (pathname.startsWith('/api/')) return RATE_LIMIT.apiMaxRequests;
  return RATE_LIMIT.maxRequests;
}

// Rate limiting check
function checkRateLimit(request: NextRequest): { allowed: boolean; resetTime: number } {
  const ip = getClientIP(request);
  const pathname = request.nextUrl.pathname;
  const maxRequests = getRateLimit(pathname);
  
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;
  const key = `${ip}-${pathname.startsWith('/api/') ? 'api' : pathname === '/login' ? 'login' : 'page'}`;
  
  let requestInfo = rateLimitStore.get(key);
  
  if (!requestInfo || requestInfo.resetTime <= windowStart) {
    requestInfo = { count: 1, resetTime: now + RATE_LIMIT.windowMs };
    rateLimitStore.set(key, requestInfo);
    return { allowed: true, resetTime: requestInfo.resetTime };
  }
  
  if (requestInfo.count >= maxRequests) {
    return { allowed: false, resetTime: requestInfo.resetTime };
  }
  
  requestInfo.count++;
  return { allowed: true, resetTime: requestInfo.resetTime };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Apply rate limiting
  const rateLimitResult = checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': getRateLimit(pathname).toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime / 1000).toString(),
      },
    });
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    return handleApiRoute(request);
  }

  // Handle page routes
  return handlePageRoute(request);
}

// Handle API route protection
async function handleApiRoute(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip authentication for excluded routes
  if (AUTH_EXCLUDED_API_ROUTES.some(route => pathname.startsWith(route))) {
    return addCorsHeaders(addSecurityHeaders(NextResponse.next()));
  }

  // Get session for API routes
  const session = await getSession(request);
  
  if (!session) {
    return addCorsHeaders(
      new NextResponse(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }

  if (!session.isActive) {
    return addCorsHeaders(
      new NextResponse(
        JSON.stringify({ success: false, error: 'Account deactivated' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }

  // Check API permissions
  const hasPermission = checkApiPermission(pathname, method, session.role);
  if (!hasPermission) {
    return addCorsHeaders(
      new NextResponse(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );
  }

  return addCorsHeaders(addSecurityHeaders(NextResponse.next()));
}

// Handle page route protection
async function handlePageRoute(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Handle public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {    
    // If user is already logged in and trying to access login page, redirect
    if (pathname === '/login') {
      const session = await getSession(request);
      if (session?.isActive) {
        const redirectUrl = session.role === 'admin' ? '/dashboard' : '/classes';
        return addSecurityHeaders(NextResponse.redirect(new URL(redirectUrl, request.url)));
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // Check authentication for protected routes
  const session = await getSession(request);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  if (!session.isActive) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // FIXED: Use consistent cookie name
    response.cookies.delete('session-token');
    return addSecurityHeaders(response);
  }

  // Check page route permissions
  const matchedRoute = Object.keys(PROTECTED_PAGE_ROUTES).find(route => 
    pathname.startsWith(route)
  );

  if (matchedRoute) {
    const allowedRoles = PROTECTED_PAGE_ROUTES[matchedRoute];
    if (allowedRoles && !allowedRoles.includes(session.role)) {
      return addSecurityHeaders(NextResponse.redirect(new URL('/classes', request.url)));
    }
  }

  // Root redirect - only redirect if at exactly "/"
  if (pathname === '/') {
    const redirectTo = session.role === 'admin' ? '/dashboard' : '/classes';
    return addSecurityHeaders(NextResponse.redirect(new URL(redirectTo, request.url)));
  }

  return addSecurityHeaders(NextResponse.next());
}

// Check API permissions
function checkApiPermission(pathname: string, method: string, userRole: UserRole): boolean {
  // Find matching API route (support dynamic routes)
  const matchedRoute = Object.keys(API_PERMISSIONS).find(route => {
    // Exact match
    if (pathname === route) return true;
    
    // Dynamic route match (e.g., /api/staff/[id])
    if (pathname.startsWith(route + '/')) return true;
    
    return false;
  });

  if (!matchedRoute) {
    // If no specific permission defined, allow all authenticated users
    return true;
  }

  const routePermissions = API_PERMISSIONS[matchedRoute];
  const methodPermissions = routePermissions.methods[method];

  if (!methodPermissions) {
    return false;
  }

  return methodPermissions.includes(userRole);
}

// Add CORS headers for API routes
function addCorsHeaders(response: NextResponse): NextResponse {
  const origin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    : 'http://localhost:3000';

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

// Add comprehensive security headers
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Basic security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  // Content Security Policy
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googleapis.com https://*.firebaseapp.com https://www.gstatic.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.googleapis.com https://*.firebaseapp.com https://firebasestorage.googleapis.com https://*.stripe.com",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};