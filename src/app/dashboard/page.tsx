// src/app/dashboard/page.tsx - Updated with sharp design
import { getServerSession } from '@/app/lib/auth/session';
import { redirect } from 'next/navigation';
import LogoutButton from '../components/ui/LogoutButton';

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

  return (
    <div className="min-h-screen bg-background-default">
      {/* Header */}
      <header className="bg-background-paper shadow-sharp border-b-2 border-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-primary-900 tracking-wide">
                Pacific MMA Admin
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-text-secondary">
                Welcome, <span className="font-semibold text-text-primary">{session.fullName}</span>
              </div>
              
              <LogoutButton className="inline-flex items-center px-4 py-2 border-2 border-primary-900 text-sm font-semibold rounded text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 shadow-sharp hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0">
                Logout
              </LogoutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-background-paper rounded-md shadow-sharp p-6 mb-8 border border-border-light">
            <h2 className="text-2xl font-bold text-text-primary mb-2 tracking-wide">
              Dashboard
            </h2>
            <p className="text-text-secondary font-medium">
              Welcome to the Pacific MMA Academy admin panel. Manage your gym operations from here.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-background-paper p-6 rounded-md shadow-sharp border border-border-light hover:shadow-medium hover:-translate-y-1 transition-all duration-150">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary-100 rounded border border-primary-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Total Members
                    </dt>
                    <dd className="text-2xl font-bold text-text-primary">
                      --
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-background-paper p-6 rounded-md shadow-sharp border border-border-light hover:shadow-medium hover:-translate-y-1 transition-all duration-150">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-secondary-100 rounded border border-secondary-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-secondary-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Active Classes
                    </dt>
                    <dd className="text-2xl font-bold text-text-primary">
                      --
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-background-paper p-6 rounded-md shadow-sharp border border-border-light hover:shadow-medium hover:-translate-y-1 transition-all duration-150">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-success-100 rounded border border-success-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-success-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Monthly Revenue
                    </dt>
                    <dd className="text-2xl font-bold text-text-primary">
                      --
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-background-paper p-6 rounded-md shadow-sharp border border-border-light hover:shadow-medium hover:-translate-y-1 transition-all duration-150">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-warning-100 rounded border border-warning-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-warning-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-text-muted truncate">
                      Staff Members
                    </dt>
                    <dd className="text-2xl font-bold text-text-primary">
                      --
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-background-paper rounded-md shadow-sharp p-6 border border-border-light">
            <h3 className="text-lg leading-6 font-semibold text-text-primary mb-4 tracking-wide">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <a
                href="/staff"
                className="inline-flex items-center px-4 py-3 border-2 border-border-medium shadow-soft text-sm font-medium rounded text-text-primary bg-background-paper hover:bg-background-muted hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                Manage Staff
              </a>

              <a
                href="/members"
                className="inline-flex items-center px-4 py-3 border-2 border-border-medium shadow-soft text-sm font-medium rounded text-text-primary bg-background-paper hover:bg-background-muted hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Members
              </a>

              <a
                href="/classes"
                className="inline-flex items-center px-4 py-3 border-2 border-border-medium shadow-soft text-sm font-medium rounded text-text-primary bg-background-paper hover:bg-background-muted hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Manage Classes
              </a>

              <a
                href="/memberships"
                className="inline-flex items-center px-4 py-3 border-2 border-border-medium shadow-soft text-sm font-medium rounded text-text-primary bg-background-paper hover:bg-background-muted hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Memberships
              </a>

              <a
                href="/discounts"
                className="inline-flex items-center px-4 py-3 border-2 border-border-medium shadow-soft text-sm font-medium rounded text-text-primary bg-background-paper hover:bg-background-muted hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Discounts
              </a>

              <a
                href="/my-schedule"
                className="inline-flex items-center px-4 py-3 border-2 border-border-medium shadow-soft text-sm font-medium rounded text-text-primary bg-background-paper hover:bg-background-muted hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-150 hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                My Schedule
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}