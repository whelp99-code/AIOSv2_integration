'use client'

import { SessionProvider } from '@/lib/auth/session-provider'
import { Dashboard } from '@/components/dashboard/dashboard'

export default function DashboardPage() {
  return (
    <SessionProvider>
      <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <Dashboard />
      </div>
    </SessionProvider>
  )
}
