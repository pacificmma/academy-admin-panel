// src/app/login/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import LoginForm from '@/app/components/forms/LoginForm';

export default async function LoginPage() {
  // Check if user is already logged in
  const session = await getServerSession();
  
  if (session?.isActive) {
    // Redirect based on user role
    if (session.role === 'admin') {
      redirect('/dashboard');
    } else {
      redirect('/classes');
    }
  }

  return (
    <div className="min-h-screen bg-background-default flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-900 rounded-md flex items-center justify-center shadow-sharp">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-text-primary tracking-wide">
            Pacific MMA Academy
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary font-medium">
            Admin Panel
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-background-paper rounded-md shadow-sharp p-8 border border-border-light">
          <h3 className="text-xl font-semibold text-text-primary mb-6 text-center tracking-wide">
            Sign in to your account
          </h3>
          
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-text-muted">
            © 2024 Pacific MMA Academy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}