'use client'

import { useEffect, useMemo, useState } from 'react'

interface CollaborationAssignment {
  id: string
  title: string
  description: string
  assignedTo: string
  status: string
  targetFiles: string[]
  metadata: Record<string, unknown>
}

interface CollaborationHandoff {
  id: string
  from: string
  to: string
  reason: string
  summary: string
  createdAt: string
}

interface CollaborationArtifact {
  type: string
  description: string
  metadata: Record<string, unknown>
  createdAt: string
}

interface CollaborationSession {
  id: string
  title: string
  objective: string
  status: string
  owner: string
  assignments: CollaborationAssignment[]
  handoffs: CollaborationHandoff[]
  artifacts: CollaborationArtifact[]
  participants: Array<{ displayName: string; tool: string; role: string }>
}

interface ApprovalRequest {
  id: string
  sessionId: string
  assignmentId: string
  requestedBy: string
  actionType: string
  target: string
  status: string
}

export default function CollaborationPage() {
  const [sessions, setSessions] = useState<CollaborationSession[]>([])
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function loadData() {
    const [sessionsRes, approvalsRes] = await Promise.all([
      fetch('/api/collaboration/sessions', { cache: 'no-store' }),
      fetch('/api/approvals', { cache: 'no-store' }),
    ])

    const sessionsData = await sessionsRes.json()
    const approvalsData = await approvalsRes.json()
    setSessions(sessionsData.sessions ?? [])
    setApprovals(approvalsData.approvals ?? [])
    setSelectedSessionId((current) => current || sessionsData.sessions?.[0]?.id || '')
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
    const sessionTimer = window.setInterval(() => void loadData(), 5000)
    return () => window.clearInterval(sessionTimer)
  }, [])

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? sessions[0],
    [selectedSessionId, sessions],
  )

  async function triggerExecution(tool: 'cursor' | 'opencode', payload: Record<string, unknown> = {}) {
    if (!selectedSession) return
    setBusy(`${tool}-execute`)
    await fetch('/api/collaboration/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: selectedSession.id,
        tool,
        taskTitle: payload.taskTitle ?? `${tool} collaboration task`,
        taskPrompt: payload.taskPrompt ?? `${tool} collaboration task`,
        targetFiles: payload.targetFiles ?? [],
        requiredApprovals: payload.requiredApprovals ?? [],
        actionType: payload.actionType,
      }),
    })
    setBusy(null)
    await loadData()
  }

  async function requestApproval() {
    if (!selectedSession || !selectedSession.assignments[0]) return
    setBusy('approval-request')
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: selectedSession.id,
        assignmentId: selectedSession.assignments[0].id,
        requester: 'cursor',
        requestedBy: 'cursor',
        actionType: 'deploy',
        target: selectedSession.assignments[0].targetFiles.join(', ') || selectedSession.assignments[0].title,
      }),
    })
    setBusy(null)
    await loadData()
  }

  async function resolveApproval(approvalId: string, status: 'approved' | 'rejected' | 'deferred') {
    setBusy(`approval-${approvalId}`)
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalId,
        status,
        resolvedBy: 'portal-user',
        resolution: `${status} via collaboration console`,
      }),
    })
    setBusy(null)
    await loadData()
  }

  async function retryAssignment(assignmentId: string, tool: 'cursor' | 'opencode') {
    if (!selectedSession) return
    setBusy(`retry-${assignmentId}`)
    await fetch(`/api/collaboration/assignments/${assignmentId}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: selectedSession.id,
        tool,
        taskTitle: 'Retry failed assignment',
        taskPrompt: 'Retry failed assignment',
      }),
    })
    setBusy(null)
    await loadData()
  }

  const sessionApprovals = approvals.filter((approval) => approval.sessionId === selectedSession?.id)

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Collaboration Control Center</h1>
          <p className="mt-2 text-sm text-slate-600">
            Cursor는 오케스트레이션, opencode는 구현, Codex는 보조 리뷰, 승인 큐는 운영 게이트로 관리합니다.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" disabled={busy !== null} onClick={() => triggerExecution('cursor')}>
              Cursor 실행
            </button>
            <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white" disabled={busy !== null} onClick={() => triggerExecution('opencode')}>
              opencode 실행
            </button>
            <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white" disabled={busy !== null} onClick={requestApproval}>
              approval 요청
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px,1.2fr,1fr]">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Active Sessions</h2>
            <div className="mt-4 space-y-3">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full rounded-xl border p-3 text-left ${
                    selectedSession?.id === session.id ? 'border-slate-900 bg-slate-100' : 'border-slate-200'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900">{session.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{session.status}</div>
                </button>
              ))}
              {!loading && sessions.length === 0 && <p className="text-sm text-slate-500">세션이 없습니다.</p>}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Session Detail</h2>
            {selectedSession ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{selectedSession.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedSession.objective}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Participants</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedSession.participants.map((participant) => (
                      <span key={`${participant.tool}-${participant.role}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                        {participant.displayName} / {participant.role}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Assignments</p>
                  <div className="mt-2 space-y-3">
                    {selectedSession.assignments.map((assignment) => (
                      <div key={assignment.id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{assignment.title}</p>
                            <p className="text-xs text-slate-500">{assignment.assignedTo} / {assignment.status}</p>
                          </div>
                          {(assignment.status === 'failed' || assignment.status === 'waiting-for-approval') && (
                            <button
                              className="rounded-lg bg-rose-500 px-3 py-1 text-xs text-white"
                              disabled={busy !== null}
                              onClick={() => retryAssignment(assignment.id, assignment.assignedTo === 'cursor' ? 'cursor' : 'opencode')}
                            >
                              재시도
                            </button>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{assignment.description}</p>
                        {assignment.targetFiles.length > 0 && (
                          <p className="mt-2 text-xs text-slate-500">{assignment.targetFiles.join(', ')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Handoffs</p>
                  <div className="mt-2 space-y-2">
                    {selectedSession.handoffs.map((handoff) => (
                      <div key={handoff.id} className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
                        {handoff.from} → {handoff.to} | {handoff.summary}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">선택된 세션이 없습니다.</p>
            )}
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Pending Approvals</h2>
              <div className="mt-4 space-y-3">
                {sessionApprovals.map((approval) => (
                  <div key={approval.id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">{approval.assignmentId}</p>
                    <p className="mt-1 text-xs text-slate-500">{approval.actionType} / {approval.status}</p>
                    <p className="mt-2 text-xs text-slate-500">{approval.target}</p>
                    {approval.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white" disabled={busy !== null} onClick={() => resolveApproval(approval.id, 'approved')}>
                          승인
                        </button>
                        <button className="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white" disabled={busy !== null} onClick={() => resolveApproval(approval.id, 'rejected')}>
                          반려
                        </button>
                        <button className="rounded-lg bg-slate-500 px-3 py-1 text-xs text-white" disabled={busy !== null} onClick={() => resolveApproval(approval.id, 'deferred')}>
                          보류
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {!loading && sessionApprovals.length === 0 && <p className="text-sm text-slate-500">대기 중 승인 없음</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Recent Artifacts</h2>
              <div className="mt-4 space-y-3">
                {selectedSession?.artifacts.slice(-5).reverse().map((artifact, index) => (
                  <div key={`${artifact.type}-${index}`} className="rounded-xl bg-slate-100 p-3">
                    <p className="text-sm font-medium text-slate-900">{artifact.type}</p>
                    <p className="mt-1 text-xs text-slate-600">{artifact.description}</p>
                  </div>
                ))}
                {!selectedSession?.artifacts.length && <p className="text-sm text-slate-500">artifact 없음</p>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
