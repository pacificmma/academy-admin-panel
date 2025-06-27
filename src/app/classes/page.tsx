// src/app/classes/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import ClassesPageClient from './ClassesPageClient';


export default async function ClassesPage() {
    // Check authentication
    const session = await getServerSession();

    if (!session?.isActive) {
        redirect('/login');
    }

    return <ClassesPageClient session={session} />;
}