'use client'

import { useCallback, useEffect, useState } from 'react'

type HubTab = 'inbox' | 'candidates' | 'insights' | 'attachments'

interface ThreadGroup {
  key: string
  label: string
  count: number
  messageIds: string[]
  userReplied?: boolean
  aiGrouped?: boolean
  participants?: string[]
}

interface AnalyzeMessage {
  id: string
  subject?: string
  from?: string
  fromName?: string
  receivedAt?: string
  bodyPreview?: string
  isRead?: boolean
  mailFolder?: string
}

interface AnalyzePayload {
  connected?: boolean
  messages?: AnalyzeMessage[]
  threadGroups?: ThreadGroup[]
  sync?: { mode?: string; newCount?: number; totalCached?: number; lastSyncedAt?: string }
  result?: { messageInsights?: Array<{ id: string; summary?: string[]; status?: string }> }
}

interface OutlookStatus {
  connected: boolean
  mailboxUser?: string
  aiProvider?: string
}

type AttachmentRef = {
  id?: string
  name?: string
  subject?: string
  fromAddress?: string
  category?: string
  proxyPath?: string
}

export default function MailPage() {
  const [hubTab, setHubTab] = useState<HubTab>('inbox')
  const [analyze, setAnalyze] = useState<AnalyzePayload | null>(null)
  const [status, setStatus] = useState<OutlookStatus | null>(null)
  const [candidates, setCandidates] = useState<unknown[]>([])
  const [insights, setInsights] = useState<unknown[]>([])
  const [attachments, setAttachments] = useState<AttachmentRef[]>([])
  const [selectedThread, setSelectedThread] = useState<ThreadGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingApproval, setPendingApproval] = useState<string | null>(null)

  const fetchInbox = useCallback(async () => {
    const [statusRes, analyzeRes] = await Promise.all([
      fetch('/api/proxy/outlook/status'),
      fetch('/api/proxy/outlook/analyze?top=50&sync=auto'),
    ])
    if (statusRes.ok) setStatus(await statusRes.json())
    if (analyzeRes.ok) {
      const data = await analyzeRes.json()
      setAnalyze(data)
      setError(null)
    } else {
      setError('메일 분석을 불러오지 못했습니다.')
    }
  }, [])

  const fetchTabData = useCallback(async (tab: HubTab) => {
    if (tab === 'inbox') {
      await fetchInbox()
      return
    }
    if (tab === 'candidates') {
      const res = await fetch('/api/proxy/outlook/candidates', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setCandidates(data.candidates || [])
      }
      return
    }
    if (tab === 'insights') {
      const res = await fetch('/api/proxy/outlook/thread-insights')
      if (res.ok) {
        const data = await res.json()
        setInsights(data.threads || [])
      }
      return
    }
    if (tab === 'attachments') {
      const res = await fetch('/api/proxy/outlook/attachments')
      if (res.ok) {
        const data = await res.json()
        setAttachments(data.attachments || data.entries || [])
      }
    }
  }, [fetchInbox])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchTabData(hubTab)
    } catch {
      setError('데이터를 가져올 수 없습니다.')
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [fetchTabData, hubTab])

  useEffect(() => {
    refresh()
  }, [hubTab, refresh])

  const threadGroups = analyze?.threadGroups || []
  const messagesById = new Map((analyze?.messages || []).map((m) => [m.id, m]))

  const selectedMessages = selectedThread
    ? (selectedThread.messageIds || [])
        .map((id) => messagesById.get(id))
        .filter(Boolean) as AnalyzeMessage[]
    : []

  async function requestSendDraft() {
    setPendingApproval('발송 승인 요청 중...')
    const res = await fetch('/api/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'draft@example.com',
        subject: '승인 테스트',
        body: 'Approval gate test draft',
        requestedBy: 'mail-hub',
      }),
    })
    const data = await res.json()
    if (res.status === 409) {
      setPendingApproval(`승인 대기: ${data.approval?.id || 'pending'}`)
    } else if (res.ok) {
      setPendingApproval('승인 후 발송 완료')
    } else {
      setPendingApproval(data.error || '발송 실패')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
        메일 허브 로딩 중...
      </div>
    )
  }

  const tabStyle = (tab: HubTab) => ({
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer' as const,
    fontWeight: 600,
    backgroundColor: hubTab === tab ? '#111827' : '#f3f4f6',
    color: hubTab === tab ? '#fff' : '#374151',
  })

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f9fafb' }}>
      <div style={{ width: 420, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>메일 허브</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                {status?.connected ? status.mailboxUser || '연결됨' : '연결 안됨'}
                {analyze?.sync?.lastSyncedAt ? ` · ${analyze.sync.mode} · 신규 ${analyze.sync.newCount ?? 0}` : ''}
              </p>
            </div>
            <button type="button" onClick={refresh} disabled={refreshing} style={{ padding: '8px 12px' }}>
              {refreshing ? '...' : '새로고침'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {(['inbox', 'candidates', 'insights', 'attachments'] as HubTab[]).map((tab) => (
              <button key={tab} type="button" style={tabStyle(tab)} onClick={() => setHubTab(tab)}>
                {tab === 'inbox' && 'Inbox'}
                {tab === 'candidates' && 'Candidates'}
                {tab === 'insights' && 'Insights'}
                {tab === 'attachments' && '첨부'}
              </button>
            ))}
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>}
          {pendingApproval && (
            <p style={{ color: '#2563eb', fontSize: 12, marginTop: 8 }}>{pendingApproval}</p>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {hubTab === 'inbox' &&
            (threadGroups.length === 0 ? (
              <p style={{ padding: 24, color: '#6b7280' }}>스레드가 없습니다.</p>
            ) : (
              threadGroups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => setSelectedThread(group)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 20px',
                    border: 'none',
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedThread?.key === group.key ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{group.label}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    {group.count}통
                    {group.userReplied ? ' · 회신함' : ''}
                    {group.aiGrouped ? ' · AI' : ''}
                  </div>
                </button>
              ))
            ))}

          {hubTab === 'candidates' &&
            (candidates.length === 0 ? (
              <p style={{ padding: 24, color: '#6b7280' }}>후보가 없습니다.</p>
            ) : (
              candidates.map((c: { mailMessageId?: string; title?: string; summary?: string }, i) => (
                <div key={c.mailMessageId || i} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{c.summary}</div>
                </div>
              ))
            ))}

          {hubTab === 'insights' &&
            (insights.length === 0 ? (
              <p style={{ padding: 24, color: '#6b7280' }}>인사이트 스레드가 없습니다.</p>
            ) : (
              insights.map((t: { threadKey?: string; threadTitle?: string; summary?: string }, i) => (
                <div key={t.threadKey || i} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 600 }}>{t.threadTitle}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{t.summary}</div>
                </div>
              ))
            ))}

          {hubTab === 'attachments' &&
            (attachments.length === 0 ? (
              <p style={{ padding: 24, color: '#6b7280' }}>첨부 아카이브가 비어 있습니다.</p>
            ) : (
              attachments.map((a, i) => (
                <div key={a.id || i} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ fontWeight: 600 }}>{a.name || a.id}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {[a.fromAddress, a.subject, a.category].filter(Boolean).join(' · ')}
                  </div>
                </div>
              ))
            ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {selectedThread ? (
          <>
            <h3 style={{ marginTop: 0 }}>{selectedThread.label}</h3>
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              참여: {(selectedThread.participants || []).join(', ')}
            </p>
            <h4>스레드 타임라인</h4>
            {selectedMessages.map((m) => (
              <div key={m.id} style={{ marginBottom: 16, padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {m.mailFolder === 'sentitems' ? '보낸' : '받은'} · {m.fromName || m.from} ·{' '}
                  {m.receivedAt ? new Date(m.receivedAt).toLocaleString('ko-KR') : ''}
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{m.subject}</div>
                <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{m.bodyPreview}</div>
              </div>
            ))}
            {!selectedThread.userReplied && (
              <button type="button" onClick={requestSendDraft} style={{ marginTop: 12, padding: '10px 16px' }}>
                발송 (승인 게이트 테스트)
              </button>
            )}
          </>
        ) : (
          <p style={{ color: '#6b7280' }}>스레드를 선택하세요.</p>
        )}
      </div>
    </div>
  )
}
