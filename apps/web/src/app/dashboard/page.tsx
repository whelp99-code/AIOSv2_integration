'use client'

import { SessionProvider } from '@/lib/auth/session-provider'
import dynamic from 'next/dynamic'

const Dashboard = dynamic(
  () => import('@/components/dashboard/dashboard').then(mod => ({ default: mod.Dashboard })),
  { ssr: false }
)

export default function DashboardPage() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <main className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Dashboard />
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}
