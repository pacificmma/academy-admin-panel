// src/app/members/page.tsx - Members page wrapper
import { Metadata } from 'next';
import { getServerSession } from '@/app/lib/auth/session';
import MembersPageClient from './MembersPageClient';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Members Management | Gym Admin',
  description: 'Manage gym members, create new accounts, and handle family memberships',
};

export default async function MembersPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.isActive) {
    redirect('/login');
  }
  return <MembersPageClient session={session} />;
}
