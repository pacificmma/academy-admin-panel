// src/app/lib/security/config.ts
export const securityConfig = {
    session: {
      maxAge: process.env.NODE_ENV === 'production' ? 24 * 60 * 60 : 7 * 24 * 60 * 60, // 1 day prod, 7 days dev
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    },
    
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
      loginMaxRequests: process.env.NODE_ENV === 'production' ? 5 : 50,
    },
    
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: process.env.NODE_ENV === 'production',
    },
    
    allowed: {
      origins: process.env.ALLOWED_ORIGINS?.split(',') || [],
      domains: process.env.ALLOWED_DOMAINS?.split(',') || [],
    },
  };