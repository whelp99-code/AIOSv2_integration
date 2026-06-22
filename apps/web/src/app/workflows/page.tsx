'use client'

import { useEffect, useState, useCallback } from 'react'

interface Workflow {
  id: string
  name: string
  description?: string
  status?: string
  type?: string
  createdAt?: string
  updatedAt?: string
}

type StatusFilter = 'all' | 'active' | 'completed' | 'BACKLOG' | 'IN_PROGRESS' | 'DONE'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch('/api/workflows')
      if (res.ok) {
        const data = await res.json()
        setWorkflows(data.workflows || [])
      } else {
        setError('워크플로우를 불러오는 중 오류가 발생했습니다.')
      }
    } catch (err) {
      console.error('워크플로우 로딩 실패:', err)
      setError('워크플로우 데이터를 가져올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  const handleCreate = async () => {
    if (!newWorkflow.name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorkflow),
      })
      if (res.ok) {
        setShowCreateModal(false)
        setNewWorkflow({ name: '', description: '' })
        fetchWorkflows()
      } else {
        setError('워크플로우 생성에 실패했습니다.')
      }
    } catch (err) {
      setError('워크플로우 생성 중 오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
      case 'IN_PROGRESS':
        return { bg: 'bg-blue-100', text: 'text-blue-600', label: '진행 중' }
      case 'completed':
      case 'DONE':
        return { bg: 'bg-emerald-100', text: 'text-emerald-600', label: '완료' }
      case 'BACKLOG':
        return { bg: 'bg-amber-100', text: 'text-amber-600', label: '대기' }
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', label: status || '알 수 없음' }
    }
  }

  const filteredWorkflows = statusFilter === 'all'
    ? workflows
    : workflows.filter((w) => {
        if (statusFilter === 'active') return w.status === 'active' || w.status === 'IN_PROGRESS'
        if (statusFilter === 'completed') return w.status === 'completed' || w.status === 'DONE'
        if (statusFilter === 'BACKLOG') return w.status === 'BACKLOG'
        if (statusFilter === 'IN_PROGRESS') return w.status === 'IN_PROGRESS'
        if (statusFilter === 'DONE') return w.status === 'DONE'
        return true
      })

  const statusCounts = {
    all: workflows.length,
    active: workflows.filter((w) => w.status === 'active' || w.status === 'IN_PROGRESS').length,
    completed: workflows.filter((w) => w.status === 'completed' || w.status === 'DONE').length,
    backlog: workflows.filter((w) => w.status === 'BACKLOG').length,
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚡</div>
          <div className="text-base text-gray-500">워크플로우 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            ⚡ 워크플로우
          </h1>
          <p className="text-sm text-gray-500">
            AIOS v1과 연동된 태스크 기반 워크플로우 관리
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          + 새 워크플로우
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">⚠️ {error}</p>
        </div>
      )}

      {/* Status Cards */}
      <div className="mb-7 grid grid-cols-4 gap-4">
        {[
          { label: '전체', count: statusCounts.all, color: 'text-gray-500', bg: 'bg-gray-100' },
          { label: '진행 중', count: statusCounts.active, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: '완료', count: statusCounts.completed, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: '대기', count: statusCounts.backlog, color: 'text-amber-600', bg: 'bg-amber-100' },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
            <div className={`inline-block rounded-full px-3 py-1 ${card.bg} mb-2`}>
              <span className={`text-xs font-semibold ${card.color}`}>{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.count}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-5 flex gap-2">
        {([
          { key: 'all' as StatusFilter, label: '전체' },
          { key: 'IN_PROGRESS' as StatusFilter, label: '진행 중' },
          { key: 'BACKLOG' as StatusFilter, label: '대기' },
          { key: 'DONE' as StatusFilter, label: '완료' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`rounded-lg px-4 py-2 text-xs font-medium ${
              statusFilter === tab.key
                ? 'border-2 border-gray-900 bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workflow List */}
      {filteredWorkflows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-4 text-5xl">📋</div>
          <p className="mb-2 text-base text-gray-500">
            워크플로우가 없습니다
          </p>
          <p className="text-sm text-gray-400">
            새 워크플로우를 생성하여 시작하세요
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredWorkflows.map((workflow) => {
            const statusStyle = getStatusColor(workflow.status)
            return (
              <div key={workflow.id} className="flex cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${statusStyle.bg} text-lg`}>
                  ⚡
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-semibold text-gray-900">
                    {workflow.name}
                  </p>
                  {workflow.description && (
                    <p className="truncate text-xs text-gray-500">
                      {workflow.description}
                    </p>
                  )}
                </div>
                <div className={`shrink-0 rounded-full px-3.5 py-1.5 ${statusStyle.bg}`}>
                  <span className={`text-xs font-medium ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
                {workflow.createdAt && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {new Date(workflow.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-bold text-gray-900">
              새 워크플로우 생성
            </h3>
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                이름 *
              </label>
              <input
                type="text"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                placeholder="워크플로우 이름을 입력하세요"
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="mb-7">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                설명
              </label>
              <textarea
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder="워크플로우 설명을 입력하세요"
                rows={3}
                className="w-full resize-y rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewWorkflow({ name: '', description: '' })
                }}
                className="rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-700"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newWorkflow.name.trim()}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white ${
                  creating || !newWorkflow.name.trim()
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-gray-900'
                }`}
              >
                {creating ? '생성 중...' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
