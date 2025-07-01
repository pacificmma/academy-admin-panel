// src/app/classes/page.tsx
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

  // Pass session to the client component
  return <ClassesPageClient session={session} />;
}