'use client'

import { useEffect, useState, useCallback } from 'react'

interface MailMessage {
  id: string
  subject: string
  from?: { emailAddress?: { address?: string; name?: string } }
  toRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>
  receivedDateTime?: string
  bodyPreview?: string
  isRead?: boolean
  hasAttachments?: boolean
  importance?: string
  body?: { content?: string; contentType?: string }
}

interface OutlookStatus {
  connected: boolean
  hasAccessToken: boolean
  mailboxUser?: string
  aiProvider?: string
  authMode?: string
}

type FilterTab = 'all' | 'unread' | 'read'

export default function MailPage() {
  const [messages, setMessages] = useState<MailMessage[]>([])
  const [outlookStatus, setOutlookStatus] = useState<OutlookStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMail, setSelectedMail] = useState<MailMessage | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [statusRes, messagesRes] = await Promise.all([
        fetch('/api/proxy/outlook/status'),
        fetch('/api/proxy/outlook/messages'),
      ])

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setOutlookStatus(statusData)
      }

      if (messagesRes.ok) {
        const data = await messagesRes.json()
        setMessages(data.messages || [])
      } else {
        setError('메일을 불러오는 중 오류가 발생했습니다.')
      }
    } catch (err) {
      console.error('메일 로딩 실패:', err)
      setError('메일 데이터를 가져올 수 없습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredMessages = messages.filter((msg) => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'unread' && !msg.isRead) ||
      (activeTab === 'read' && msg.isRead)

    const matchesSearch =
      !searchQuery ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.from?.emailAddress?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.from?.emailAddress?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.bodyPreview?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesTab && matchesSearch
  })

  const unreadCount = messages.filter((m) => !m.isRead).length
  const readCount = messages.filter((m) => m.isRead).length

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📧</div>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>메일함 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#f9fafb' }}>
      {/* Left: Mail List Panel */}
      <div style={{
        width: '420px',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'white',
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: 0 }}>
                📧 메일함
              </h2>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                Outlook {outlookStatus?.connected ? `· ${outlookStatus.mailboxUser || '연결됨'}` : '· 연결 안됨'}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                color: '#374151',
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? '새로고침 중...' : '🔄 새로고침'}
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="메일 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#f9fafb',
              boxSizing: 'border-box',
            }}
          />

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {([
              { key: 'all' as FilterTab, label: '전체', count: messages.length },
              { key: 'unread' as FilterTab, label: '읽지 않음', count: unreadCount },
              { key: 'read' as FilterTab, label: '읽음', count: readCount },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: activeTab === tab.key ? '#111827' : '#f3f4f6',
                  color: activeTab === tab.key ? 'white' : '#6b7280',
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Mail List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: '16px 24px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>⚠️ {error}</p>
            </div>
          )}

          {filteredMessages.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
              <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
                {searchQuery ? '검색 결과가 없습니다.' : '메일이 없습니다.'}
              </p>
            </div>
          ) : (
            filteredMessages.map((mail) => (
              <div
                key={mail.id}
                onClick={() => setSelectedMail(mail)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  backgroundColor: selectedMail?.id === mail.id ? '#eff6ff' : mail.isRead ? 'white' : '#f0f9ff',
                  transition: 'background-color 0.15s',
                  display: 'flex',
                  gap: '12px',
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: mail.isRead ? '#d1d5db' : '#3b82f6',
                  marginTop: '7px',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#111827',
                      margin: 0,
                      fontWeight: mail.isRead ? 'normal' : '600',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}>
                      {mail.subject || '제목 없음'}
                    </p>
                    <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                      {formatDate(mail.receivedDateTime)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    margin: '4px 0 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {mail.from?.emailAddress?.name || mail.from?.emailAddress?.address || '발신자 없음'}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#9ca3af',
                    margin: '4px 0 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {mail.bodyPreview || ''}
                  </p>
                </div>
                {mail.hasAttachments && (
                  <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '2px' }}>📎</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Mail Detail Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
        {selectedMail ? (
          <>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 12px 0' }}>
                {selectedMail.subject || '제목 없음'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#2563eb',
                }}>
                  {(selectedMail.from?.emailAddress?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {selectedMail.from?.emailAddress?.name || '발신자 없음'}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    {selectedMail.from?.emailAddress?.address || ''}
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    {selectedMail.receivedDateTime
                      ? new Date(selectedMail.receivedDateTime).toLocaleString('ko-KR')
                      : ''}
                  </p>
                  {selectedMail.toRecipients && selectedMail.toRecipients.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                      수신: {selectedMail.toRecipients.map(r => r.emailAddress?.name || r.emailAddress?.address).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              {selectedMail.importance === 'high' && (
                <div style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '6px',
                  display: 'inline-block',
                }}>
                  <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: '500' }}>🔴 중요 메일</span>
                </div>
              )}
            </div>
            <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
              {selectedMail.body?.content ? (
                <div
                  style={{ fontSize: '14px', color: '#374151', lineHeight: '1.7' }}
                  dangerouslySetInnerHTML={{ __html: selectedMail.body.content }}
                />
              ) : (
                <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.7' }}>
                  {selectedMail.bodyPreview || '메일 내용이 없습니다.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📬</div>
            <p style={{ fontSize: '18px', color: '#6b7280', margin: 0 }}>
              메일을 선택하여 내용을 확인하세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
