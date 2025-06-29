// src/app/memberships/page.tsx
import { Metadata } from 'next';
import { getSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import MembershipsPageClient from './MembershipsPageClient';

export const metadata: Metadata = {
  title: 'Membership Management | Pacific MMA Academy',
  description: 'Manage membership plans and pricing for Pacific MMA Academy',
};

export default async function MembershipsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'admin') {
    redirect('/classes');
  }

  return <MembershipsPageClient session={session} />;
}