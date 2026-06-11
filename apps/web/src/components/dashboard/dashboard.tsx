'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface MailMessage {
  id: string
  subject: string
  from?: { emailAddress?: { address?: string; name?: string } }
  receivedDateTime?: string
  bodyPreview?: string
  isRead?: boolean
}

interface OutlookStatus {
  connected: boolean
  hasAccessToken: boolean
  mailboxUser?: string
  aiProvider?: string
  authMode?: string
}

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: string
  color: string
  loading?: boolean
}

function StatsCard({ title, value, change, trend, icon, color, loading }: StatsCardProps) {
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
        {loading ? '⏳' : icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{title}</p>
        <p style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: '8px 0 4px 0' }}>
          {loading ? '...' : value}
        </p>
        {change && !loading && (
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
  const [mails, setMails] = useState<MailMessage[]>([])
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        // 서버 사이드 프록시를 통해 데이터 가져오기
        const [statusRes, mailsRes] = await Promise.all([
          fetch('/api/proxy/outlook/status'),
          fetch('/api/proxy/outlook/messages')
        ])

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setOutlookStatus(statusData)
        }

        if (mailsRes.ok) {
          const mailsData = await mailsRes.json()
          setMails(mailsData.messages || [])
        }
        
        setLoading(false)
      } catch (err) {
        console.error('데이터 로딩 실패:', err)
        setError('데이터를 가져오는 중 오류가 발생했습니다.')
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading...</div>
      </div>
    )
  }

  // 통계 계산
  const unreadCount = mails.filter(m => !m.isRead).length
  const totalCount = mails.length
  const recentMails = mails.slice(0, 15)

  const stats = [
    { 
      title: '전체 메일', 
      value: totalCount, 
      change: `${unreadCount}건 읽지 않음`, 
      trend: 'neutral' as const, 
      icon: '📧', 
      color: '#dbeafe',
      loading 
    },
    { 
      title: '읽지 않은 메일', 
      value: unreadCount, 
      change: unreadCount > 0 ? '확인 필요' : '모두 읽음', 
      trend: unreadCount > 0 ? 'up' : 'down', 
      icon: '📬', 
      color: '#fef3c7',
      loading
    },
    { 
      title: 'Outlook 연결', 
      value: outlookStatus?.connected ? '연결됨' : '연결 안됨', 
      change: outlookStatus?.authMode || 'N/A',
      trend: outlookStatus?.connected ? 'up' : 'down', 
      icon: '🔗', 
      color: outlookStatus?.connected ? '#d1fae5' : '#fee2e2',
      loading
    },
    { 
      title: 'AI 프로바이더', 
      value: outlookStatus?.aiProvider === 'f-aios-v3' ? 'F-AIOS-v3' : outlookStatus?.aiProvider || 'N/A', 
      change: 'LM Studio 연결',
      trend: 'up', 
      icon: '🤖', 
      color: '#e0e7ff',
      loading
    },
  ]

  return (
    <div style={{ padding: '32px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Welcome Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          Welcome back, {session?.user?.name || 'User'}! 👋
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
          AIOS 통합 대시보드 - 실제 메일 인텔리전스
        </p>
        {error && (
          <p style={{ fontSize: '14px', color: '#dc2626', marginTop: '8px' }}>
            ⚠️ {error}
          </p>
        )}
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
        {/* 실제 메일 목록 */}
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
              📧 실제 메일 목록 ({totalCount}건)
            </h3>
            <a 
              href="http://localhost:10200" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                fontSize: '14px',
                color: '#3b82f6',
                textDecoration: 'none'
              }}
            >
              Mail Intelligence 열기 →
            </a>
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                📥 메일 데이터 로딩 중...
              </div>
            ) : recentMails.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                메일이 없습니다. Mail Intelligence에서 메일을 가져오세요.
              </div>
            ) : (
              recentMails.map((mail, idx) => (
                <div key={mail.id || idx} style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  backgroundColor: mail.isRead ? 'transparent' : '#f0f9ff'
                }}>
                  <div style={{
                    backgroundColor: mail.isRead ? '#e5e7eb' : '#3b82f6',
                    borderRadius: '50%',
                    width: '10px',
                    height: '10px',
                    marginTop: '6px',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#111827', 
                      margin: '0 0 4px 0',
                      fontWeight: mail.isRead ? 'normal' : '600',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {mail.subject || '제목 없음'}
                    </p>
                    <p style={{ 
                      fontSize: '13px', 
                      color: '#6b7280', 
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {mail.from?.emailAddress?.name || mail.from?.emailAddress?.address || '발신자 없음'}
                    </p>
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#9ca3af',
                    flexShrink: 0
                  }}>
                    {mail.receivedDateTime ? new Date(mail.receivedDateTime).toLocaleDateString('ko-KR') : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 사이드바 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Outlook 연결 상태 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              🔗 Outlook 연결 상태
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>연결 상태</span>
                <span style={{ 
                  fontSize: '14px', 
                  color: outlookStatus?.connected ? '#059669' : '#dc2626',
                  fontWeight: '500'
                }}>
                  {outlookStatus?.connected ? '✅ 연결됨' : '❌ 연결 안됨'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>인증 방식</span>
                <span style={{ fontSize: '14px', color: '#111827' }}>
                  {outlookStatus?.authMode || 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>AI 프로바이더</span>
                <span style={{ fontSize: '14px', color: '#111827' }}>
                  {outlookStatus?.aiProvider || 'N/A'}
                </span>
              </div>
            </div>
            <a 
              href="http://localhost:10200" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                display: 'block',
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#374151',
                textDecoration: 'none'
              }}
            >
              Mail Intelligence 열기
            </a>
          </div>

          {/* 빠른 실행 */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              ⚡ 빠른 실행
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { icon: '📧', label: '메일 가져오기', action: 'import' },
                { icon: '🔍', label: '메일 분석', action: 'analyze' },
                { icon: '📊', label: '리포트', action: 'report' },
                { icon: '⚙️', label: '설정', action: 'settings' },
              ].map((item) => (
                <button 
                  key={item.action}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px 12px',
                    backgroundColor: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    gap: '8px'
                  }}
                  onClick={() => {
                    if (item.action === 'settings') {
                      window.open('http://localhost:10200', '_blank')
                    }
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
