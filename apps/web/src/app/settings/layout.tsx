import { SessionProvider } from '@/lib/auth/session-provider'

export const dynamic = 'force-dynamic'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
