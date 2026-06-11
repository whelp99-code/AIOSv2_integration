'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Mail', href: '/mail' },
  { name: 'Projects', href: '/projects' },
  { name: 'Kanban', href: '/kanban' },
  { name: 'Workflows', href: '/workflows' },
  { name: 'Sangfor', href: '/sangfor' },
  { name: 'Settings', href: '/settings' },
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  return (
    <div className="flex flex-col w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-800">
        <h1 className="text-xl font-bold">AIOSv2</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      {session?.user && (
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              {session.user.name?.[0] || 'U'}
            </div>
            <div>
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-gray-400">{session.user.email}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
