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
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">📧</div>
          <div className="text-base text-gray-500">메일함 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left: Mail List Panel */}
      <div className="flex w-[420px] shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                📧 메일함
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Outlook {outlookStatus?.connected ? `· ${outlookStatus.mailboxUser || '연결됨'}` : '· 연결 안됨'}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className={`rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-700 ${
                refreshing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
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
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none"
          />

          {/* Filter Tabs */}
          <div className="mt-3 flex gap-2">
            {([
              { key: 'all' as FilterTab, label: '전체', count: messages.length },
              { key: 'unread' as FilterTab, label: '읽지 않음', count: unreadCount },
              { key: 'read' as FilterTab, label: '읽음', count: readCount },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  activeTab === tab.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Mail List */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="border-b border-red-200 bg-red-50 px-6 py-4">
              <p className="text-xs text-red-600">⚠️ {error}</p>
            </div>
          )}

          {filteredMessages.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mb-3 text-5xl">📭</div>
              <p className="text-sm text-gray-500">
                {searchQuery ? '검색 결과가 없습니다.' : '메일이 없습니다.'}
              </p>
            </div>
          ) : (
            filteredMessages.map((mail) => (
              <div
                key={mail.id}
                onClick={() => setSelectedMail(mail)}
                className={`flex cursor-pointer gap-3 border-b border-gray-100 px-6 py-4 transition-colors ${
                  selectedMail?.id === mail.id
                    ? 'bg-blue-50'
                    : mail.isRead
                      ? 'bg-white'
                      : 'bg-blue-50/50'
                }`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    mail.isRead ? 'bg-gray-300' : 'bg-blue-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`flex-1 truncate text-sm text-gray-900 ${
                        mail.isRead ? 'font-normal' : 'font-semibold'
                      }`}
                    >
                      {mail.subject || '제목 없음'}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(mail.receivedDateTime)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {mail.from?.emailAddress?.name || mail.from?.emailAddress?.address || '발신자 없음'}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-400">
                    {mail.bodyPreview || ''}
                  </p>
                </div>
                {mail.hasAttachments && (
                  <span className="mt-0.5 shrink-0 text-sm">📎</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: Mail Detail Panel */}
      <div className="flex flex-1 flex-col bg-white">
        {selectedMail ? (
          <>
            <div className="border-b border-gray-200 px-8 py-6">
              <h2 className="mb-3 text-xl font-bold text-gray-900">
                {selectedMail.subject || '제목 없음'}
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-600">
                  {(selectedMail.from?.emailAddress?.name || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedMail.from?.emailAddress?.name || '발신자 없음'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {selectedMail.from?.emailAddress?.address || ''}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500">
                    {selectedMail.receivedDateTime
                      ? new Date(selectedMail.receivedDateTime).toLocaleString('ko-KR')
                      : ''}
                  </p>
                  {selectedMail.toRecipients && selectedMail.toRecipients.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      수신: {selectedMail.toRecipients.map(r => r.emailAddress?.name || r.emailAddress?.address).join(', ')}
                    </p>
                  )}
                </div>
              </div>
              {selectedMail.importance === 'high' && (
                <div className="mt-3 inline-block rounded-md bg-red-50 px-3 py-1.5">
                  <span className="text-xs font-medium text-red-600">🔴 중요 메일</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {selectedMail.body?.content ? (
                <div
                  className="text-sm leading-7 text-gray-700"
                  dangerouslySetInnerHTML={{ __html: selectedMail.body.content }}
                />
              ) : (
                <p className="text-sm leading-7 text-gray-500">
                  {selectedMail.bodyPreview || '메일 내용이 없습니다.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="mb-4 text-7xl">📬</div>
            <p className="text-lg text-gray-500">
              메일을 선택하여 내용을 확인하세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
