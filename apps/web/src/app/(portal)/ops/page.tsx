'use client'

import { SessionProvider } from '@/lib/auth/session-provider'
import { OpsConsole } from '@/components/ops/ops-console'

export default function OpsConsolePage() {
  return (
    <SessionProvider>
      <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        <OpsConsole />
      </div>
    </SessionProvider>
  )
}