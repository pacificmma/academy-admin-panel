// src/app/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  // Check if user is logged in
  const session = await getServerSession();
  
  if (session?.isActive) {
    // Redirect based on user role
    if (session.role === 'admin') {
      redirect('/dashboard');
    } else {
      redirect('/classes');
    }
  }
  
  // If not logged in, redirect to login
  redirect('/login');
}