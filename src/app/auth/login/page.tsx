// src/app/login/page.tsx
import LoginForm from '@/app/components/forms/LoginForm';
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  // Check if user is already logged in
  const session = await getServerSession();
  if (session?.isActive) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-primary-900 mb-2">
              PACIFIC MMA
            </h1>
            <p className="text-gray-600">Admin Login</p>
          </div>
          
          <LoginForm />
          
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Having trouble signing in? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}