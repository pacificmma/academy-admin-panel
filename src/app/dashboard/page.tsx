// src/app/dashboard/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import DashboardPageClient from './DashboardPageClient';

export default async function DashboardPage() {
  // Check authentication
  const session = await getServerSession();
  
  if (!session?.isActive) {
    redirect('/login');
  }

  // Only admins can access dashboard
  if (session.role !== 'admin') {
    redirect('/classes');
  }

  return <DashboardPageClient session={session} />;
}