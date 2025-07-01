// src/app/classes/page.tsx - Server Component for Classes Page
import { Metadata } from 'next';
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import ClassesPageClient from './ClassesPageClient';

export const metadata: Metadata = {
  title: 'Class Management | Pacific MMA Academy',
  description: 'Manage classes, schedules, and training sessions for Pacific MMA Academy',
};

export default async function ClassesPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // All authenticated users can access classes page
  // but different roles see different content
  return <ClassesPageClient />;
}