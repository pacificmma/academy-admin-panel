// src/app/staff/page.tsx - Staff Management Page
import { Metadata } from 'next';
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import StaffPageClient from './StaffPageClient';

export const metadata: Metadata = {
  title: 'Staff Management | Pacific MMA Academy',
  description: 'Manage staff members, trainers, and administrators',
};

export default async function StaffPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'admin') {
    redirect('/classes');
  }

  return <StaffPageClient session={session} />;
}