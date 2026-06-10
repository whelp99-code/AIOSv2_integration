'use client'

import { useSession } from 'next-auth/react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

function StatsCard({ title, value, change, trend }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {change && (
        <p className={`mt-2 text-sm ${
          trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
        }`}>
          {change}
        </p>
      )}
    </div>
  )
}

interface RecentActivityProps {
  activities: Array<{
    id: string
    type: string
    description: string
    timestamp: string
  }>
}

function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {activities.map((activity) => (
          <div key={activity.id} className="px-6 py-4">
            <p className="text-sm text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const stats = [
    { title: 'Total Projects', value: '12', change: '+2 this week', trend: 'up' as const },
    { title: 'Active Tasks', value: '24', change: '5 in progress', trend: 'neutral' as const },
    { title: 'Completed', value: '156', change: '+12 this week', trend: 'up' as const },
    { title: 'Team Members', value: '8', change: '2 online', trend: 'neutral' as const },
  ]

  const activities = [
    { id: '1', type: 'commit', description: 'New commit pushed to main', timestamp: '2 minutes ago' },
    { id: '2', type: 'task', description: 'Task "Implement auth" completed', timestamp: '1 hour ago' },
    { id: '3', type: 'review', description: 'PR #42 approved', timestamp: '3 hours ago' },
    { id: '4', type: 'deploy', description: 'v1.2.0 deployed to staging', timestamp: '5 hours ago' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome back, {session?.user?.name || 'User'}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <RecentActivity activities={activities} />
    </div>
  )
}
