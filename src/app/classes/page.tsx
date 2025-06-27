// src/app/classes/page.tsx
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function ClassesPage() {
  // Check authentication
  const session = await getServerSession();
  
  if (!session?.isActive) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <header className="bg-background-paper shadow-soft border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-primary-900">
                Pacific MMA Classes
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-text-secondary">
                Welcome, <span className="font-medium text-text-primary">{session.fullName}</span>
                <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full">
                  {session.role.toUpperCase()}
                </span>
              </div>
              
              {session.role === 'admin' && (
                <a
                  href="/dashboard"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Dashboard
                </a>
              )}
              
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-background-paper border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a
              href="/classes"
              className="border-primary-500 text-primary-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              All Classes
            </a>
            
            {(session.role === 'trainer' || session.role === 'staff') && (
              <a
                href="/my-schedule"
                className="border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
              >
                My Schedule
              </a>
            )}
            
            {session.role === 'admin' && (
              <>
                <a
                  href="/staff"
                  className="border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                >
                  Staff
                </a>
                
                <a
                  href="/members"
                  className="border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                >
                  Members
                </a>
                
                <a
                  href="/memberships"
                  className="border-transparent text-text-secondary hover:text-text-primary hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                >
                  Memberships
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="bg-background-paper rounded-lg shadow-soft p-6 mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              Class Management
            </h2>
            <p className="text-text-secondary">
              {session.role === 'admin' 
                ? 'Manage all classes, schedules, and instructors.'
                : session.role === 'trainer'
                ? 'View and manage your assigned classes.'
                : 'View class schedules and information.'
              }
            </p>
          </div>

          {/* Today's Classes */}
          <div className="bg-background-paper rounded-lg shadow-soft p-6 mb-8">
            <h3 className="text-lg font-medium text-text-primary mb-4">
              Today's Classes
            </h3>
            
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-text-primary">No classes scheduled</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Classes will appear here when they are scheduled.
              </p>
              
              {session.role === 'admin' && (
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Class
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-background-paper rounded-lg shadow-soft p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-text-primary">
                Weekly Schedule
              </h3>
              
              {session.role === 'admin' && (
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-text-primary bg-background-paper hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage Schedule
                </button>
              )}
            </div>
            
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-text-primary">No schedule configured</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Weekly class schedule will be displayed here once configured.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}