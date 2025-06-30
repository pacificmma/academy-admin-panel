// src/app/memberships/page.tsx - Updated to Pass Session
import { Metadata } from 'next';
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import MembershipsPageClient from './MembershipsPageClient';

export const metadata: Metadata = {
  title: 'Membership Management | Pacific MMA Academy',
  description: 'Manage membership plans and pricing for Pacific MMA Academy',
};

export default async function MembershipsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'admin') {
    redirect('/classes');
  }

  // Pass session to client component - required for Layout
  return <MembershipsPageClient session={session} />;
}