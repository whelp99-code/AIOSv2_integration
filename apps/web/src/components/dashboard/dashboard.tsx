'use client'

import { useSession } from 'next-auth/react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
  color: string
}

function StatsCard({ title, value, change, trend, icon, color }: StatsCardProps) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px'
    }}>
      <div style={{
        backgroundColor: color,
        borderRadius: '10px',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{title}</p>
        <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: '8px 0 4px 0' }}>{value}</p>
        {change && (
          <p style={{ 
            fontSize: '13px', 
            color: trend === 'up' ? '#059669' : trend === 'down' ? '#dc2626' : '#6b7280',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {change}
          </p>
        )}
      </div>
    </div>
  )
}

export function Dashboard() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  const stats = [
    { title: 'Total Projects', value: '12', change: '+2 this week', trend: 'up' as const, icon: '📁', color: '#dbeafe' },
    { title: 'Active Tasks', value: '24', change: '5 in progress', trend: 'neutral' as const, icon: '📋', color: '#fef3c7' },
    { title: 'Completed', value: '156', change: '+12 this week', trend: 'up' as const, icon: '✅', color: '#d1fae5' },
    { title: 'Team Members', value: '8', change: '2 online', trend: 'neutral' as const, icon: '👥', color: '#e0e7ff' },
  ]

  const activities = [
    { id: '1', type: 'commit', icon: '🔗', description: 'New commit pushed to main', timestamp: '2 minutes ago', color: '#3b82f6' },
    { id: '2', type: 'task', icon: '🎯', description: 'Task "Implement auth" completed', timestamp: '1 hour ago', color: '#10b981' },
    { id: '3', type: 'review', icon: '👀', description: 'PR #42 approved', timestamp: '3 hours ago', color: '#8b5cf6' },
    { id: '4', type: 'deploy', icon: '🚀', description: 'v1.2.0 deployed to staging', timestamp: '5 hours ago', color: '#f59e0b' },
  ]

  const quickActions = [
    { icon: '➕', label: 'New Project', color: '#3b82f6' },
    { icon: '📝', label: 'Create Task', color: '#10b981' },
    { icon: '🔍', label: 'Search', color: '#8b5cf6' },
    { icon: '⚙️', label: 'Settings', color: '#6b7280' },
  ]

  return (
    <div style={{ padding: '32px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Welcome Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          Welcome back, {session?.user?.name || 'User'}! 👋
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
          Here&apos;s what&apos;s happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gap: '20px',
        marginBottom: '32px'
      }}>
        {stats.map((stat) => (
          <StatsCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Content Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '24px'
      }}>
        {/* Recent Activity */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Recent Activity
            </h3>
            <button style={{
              fontSize: '14px',
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}>
              View all →
            </button>
          </div>
          <div>
            {activities.map((activity) => (
              <div key={activity.id} style={{
                padding: '16px 24px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  backgroundColor: activity.color + '20',
                  borderRadius: '8px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  {activity.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: '#111827', margin: 0 }}>
                    {activity.description}
                  </p>
                  <p style={{ fontSize: '13px', color: '#9ca3af', margin: '4px 0 0 0' }}>
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 20px 0' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {quickActions.map((action) => (
              <button key={action.label} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px 16px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                gap: '8px'
              }}>
                <span style={{ fontSize: '24px' }}>{action.icon}</span>
                <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{action.label}</span>
              </button>
            ))}
          </div>

          {/* Project Progress */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              Project Progress
            </h4>
            {[
              { name: 'AIOS v2', progress: 75, color: '#3b82f6' },
              { name: 'Sangfor MCP', progress: 90, color: '#10b981' },
              { name: 'Vibe Coding OS', progress: 45, color: '#f59e0b' },
            ].map((project) => (
              <div key={project.name} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: '#374151' }}>{project.name}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>{project.progress}%</span>
                </div>
                <div style={{ 
                  height: '8px', 
                  backgroundColor: '#e5e7eb', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${project.progress}%`,
                    height: '100%',
                    backgroundColor: project.color,
                    borderRadius: '4px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
