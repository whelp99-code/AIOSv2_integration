'use client'

import { SessionProvider } from '@/lib/auth/session-provider'
import { Dashboard } from '@/components/dashboard/dashboard'

export default function DashboardPage() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <Dashboard />
      </div>
    </SessionProvider>
  )
}
