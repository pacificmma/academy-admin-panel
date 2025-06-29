// src/app/lib/security/logger.ts
interface SecurityEvent {
    type: 'login_attempt' | 'failed_login' | 'unauthorized_access' | 'session_expired';
    userId?: string;
    ip?: string;
    userAgent?: string;
    timestamp: string;
    details?: Record<string, any>;
  }
  
  export function logSecurityEvent(event: SecurityEvent) {
    if (process.env.NODE_ENV === 'production') {
      // In production, send to your logging service
      console.log('[SECURITY]', JSON.stringify(event));
    } else {
      console.log('[SECURITY]', event);
    }
  }