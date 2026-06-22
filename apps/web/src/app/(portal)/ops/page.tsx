'use client'

import { SessionProvider } from '@/lib/auth/session-provider'
import { OpsConsole } from '@/components/ops/ops-console'

export default function OpsConsolePage() {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-50">
        <OpsConsole />
      </div>
    </SessionProvider>
  )
}
