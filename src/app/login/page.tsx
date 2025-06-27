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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#EDEAE0' }}>
      <div className="max-w-sm w-full">
        {/* Main Login Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
              PACIFIC MMA
            </h1>
            <p className="text-sm font-medium" style={{ color: '#555555' }}>
              Admin Login
            </p>
          </div>

          {/* Login Form */}
          <LoginForm />

          {/* Footer Link */}
          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: '#555555' }}>
              Having trouble signing in?{' '}
              <span className="hover:underline cursor-pointer" style={{ color: '#004D61' }}>
                Contact your administrator.
              </span>
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: '#555555' }}>
            © 2024 Pacific MMA Academy. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}