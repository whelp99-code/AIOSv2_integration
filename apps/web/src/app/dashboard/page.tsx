'use client'

import { Dashboard } from '@/components/dashboard/dashboard'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Dashboard />
        </div>
      </main>
    </div>
  )
}
