// src/app/my-schedule/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from '@/app/lib/auth/session';
import MySchedulePageClient from './MySchedulePageClient';

export default async function MySchedulePage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.isActive) {
    redirect('/login');
  }

  return <MySchedulePageClient session={session} />;
}

export const metadata = {
  title: 'My Schedule - Pacific MMA Academy',
  description: 'View your schedule and classes',
};