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

interface Customer {
  id: string
  name: string
  industry?: string
  status?: string
}

interface Partner {
  id: string
  name: string
  type?: string
  status?: string
}

interface Workflow {
  id: string
  name: string
  description?: string
  status?: string
}

type IntegrationReachability = 'ok' | 'degraded' | 'unreachable' | 'planned'

interface IntegrationProjectHealth {
  id: string
  name: string
  status: IntegrationReachability
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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [integrationProjects, setIntegrationProjects] = useState<IntegrationProjectHealth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusRes, mailsRes, customersRes, partnersRes, workflowsRes, integrationsRes] = await Promise.all([
          fetch('/api/proxy/outlook/status'),
          fetch('/api/proxy/outlook/messages'),
          fetch('/api/customers'),
          fetch('/api/partners'),
          fetch('/api/workflows'),
          fetch('/api/integrations/health')
        ])

        if (statusRes.ok) {
          const statusData = await statusRes.json()
          setOutlookStatus(statusData)
        }

        if (mailsRes.ok) {
          const mailsData = await mailsRes.json()
          setMails(mailsData.messages || [])
        }

        if (customersRes.ok) {
          const customersData = await customersRes.json()
          setCustomers(customersData.customers || [])
        }

        if (partnersRes.ok) {
          const partnersData = await partnersRes.json()
          setPartners(partnersData.partners || [])
        }

        if (workflowsRes.ok) {
          const workflowsData = await workflowsRes.json()
          setWorkflows(workflowsData.workflows || [])
        }

        if (integrationsRes.ok) {
          const integrationsData = await integrationsRes.json()
          setIntegrationProjects(integrationsData.projects || [])
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

  const unreadCount = mails.filter(m => !m.isRead).length
  const totalCount = mails.length
  const recentMails = mails.slice(0, 15)
  const faiosHealth = integrationProjects.find((project) => project.id === 'f-aios-v3-core')

  function integrationStatusLabel(status: IntegrationReachability): string {
    if (status === 'ok') return '✅ 연결됨'
    if (status === 'degraded') return '⚠️ 저하됨'
    if (status === 'planned') return '📋 계획됨'
    return '❌ 미연결'
  }

  function integrationStatusColor(status: IntegrationReachability): string {
    if (status === 'ok') return '#059669'
    if (status === 'degraded') return '#d97706'
    if (status === 'planned') return '#4f46e5'
    return '#dc2626'
  }

  const stats: StatsCardProps[] = [
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
      title: '고객', 
      value: customers.length, 
      change: 'AIOS v1 연동', 
      trend: 'up' as const, 
      icon: '👥', 
      color: '#d1fae5',
      loading
    },
    { 
      title: '파트너', 
      value: partners.length, 
      change: 'AIOS v1 연동', 
      trend: 'up' as const, 
      icon: '🤝', 
      color: '#fef3c7',
      loading
    },
    { 
      title: '워크플로우', 
      value: workflows.length, 
      change: faiosHealth?.status === 'ok' ? 'F-aios-v3 연결됨' : '연결 안됨',
      trend: faiosHealth?.status === 'ok' ? 'up' as const : 'down' as const,
      icon: '⚡', 
      color: '#e0e7ff',
      loading
    },
  ]

  return (
    <div style={{ padding: '32px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
          Welcome back, {session?.user?.name || 'User'}! 👋
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
          AIOS 통합 대시보드 - 모든 프로젝트 통합 관리
        </p>
        {error && (
          <p style={{ fontSize: '14px', color: '#dc2626', marginTop: '8px' }}>
            ⚠️ {error}
          </p>
        )}
      </div>

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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '24px'
      }}>
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
                메일이 없습니다.
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              🔗 시스템 상태
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Outlook</span>
                <span style={{ 
                  fontSize: '14px', 
                  color: outlookStatus?.connected ? '#059669' : '#dc2626',
                  fontWeight: '500'
                }}>
                  {outlookStatus?.connected ? '✅ 연결됨' : '❌ 연결 안됨'}
                </span>
              </div>
              {integrationProjects.map((project) => (
                <div key={project.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>{project.name}</span>
                  <span style={{
                    fontSize: '14px',
                    color: integrationStatusColor(project.status),
                    fontWeight: '500',
                  }}>
                    {integrationStatusLabel(project.status)}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>AI 프로바이더</span>
                <span style={{ fontSize: '14px', color: '#111827' }}>
                  {outlookStatus?.aiProvider || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              👥 고객/파트너
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>고객</span>
                <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  {customers.length}명
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>파트너</span>
                <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  {partners.length}명
                </span>
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                최근 고객
              </h4>
              {customers.slice(0, 5).map((customer) => (
                <div key={customer.id} style={{
                  padding: '8px 0',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '13px',
                  color: '#374151'
                }}>
                  {customer.name} - {customer.industry || 'N/A'}
                </div>
              ))}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
              ⚡ 워크플로우
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>워크플로우 수</span>
                <span style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  {workflows.length}개
                </span>
              </div>
            </div>
            {workflows.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>
                  워크플로우 목록
                </h4>
                {workflows.slice(0, 5).map((workflow) => (
                  <div key={workflow.id} style={{
                    padding: '8px 0',
                    borderBottom: '1px solid #f3f4f6',
                    fontSize: '13px',
                    color: '#374151'
                  }}>
                    {workflow.name} - {workflow.status || 'active'}
                  </div>
                ))}
              </div>
            )}
          </div>

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
                { icon: '👥', label: '고객 관리', action: 'customers' },
                { icon: '🤝', label: '파트너 관리', action: 'partners' },
                { icon: '⚡', label: '워크플로우', action: 'workflows' },
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
                    if (item.action === 'import') {
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
