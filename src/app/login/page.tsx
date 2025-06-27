// src/app/login/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import LoginPageClient from './LoginPageClient';

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

  return <LoginPageClient />;
}