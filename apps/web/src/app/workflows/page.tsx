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
        return { bg: '#dbeafe', text: '#2563eb', label: '진행 중' }
      case 'completed':
      case 'DONE':
        return { bg: '#d1fae5', text: '#059669', label: '완료' }
      case 'BACKLOG':
        return { bg: '#fef3c7', text: '#d97706', label: '대기' }
      default:
        return { bg: '#f3f4f6', text: '#6b7280', label: status || '알 수 없음' }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚡</div>
          <div style={{ fontSize: '16px', color: '#6b7280' }}>워크플로우 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', minHeight: '100%', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>
            ⚡ 워크플로우
          </h1>
          <p style={{ fontSize: '15px', color: '#6b7280', margin: 0 }}>
            AIOS v1과 연동된 태스크 기반 워크플로우 관리
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          + 새 워크플로우
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: '전체', count: statusCounts.all, color: '#6b7280', bg: '#f3f4f6' },
          { label: '진행 중', count: statusCounts.active, color: '#2563eb', bg: '#dbeafe' },
          { label: '완료', count: statusCounts.completed, color: '#059669', bg: '#d1fae5' },
          { label: '대기', count: statusCounts.backlog, color: '#d97706', bg: '#fef3c7' },
        ].map((card) => (
          <div key={card.label} style={{
            backgroundColor: 'white',
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            border: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '12px',
              backgroundColor: card.bg,
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '13px', color: card.color, fontWeight: '600' }}>{card.label}</span>
            </div>
            <p style={{ fontSize: '28px', fontWeight: '700', color: '#111827', margin: 0 }}>{card.count}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {([
          { key: 'all' as StatusFilter, label: '전체' },
          { key: 'IN_PROGRESS' as StatusFilter, label: '진행 중' },
          { key: 'BACKLOG' as StatusFilter, label: '대기' },
          { key: 'DONE' as StatusFilter, label: '완료' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: statusFilter === tab.key ? '2px solid #111827' : '1px solid #e5e7eb',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              backgroundColor: statusFilter === tab.key ? '#111827' : 'white',
              color: statusFilter === tab.key ? 'white' : '#6b7280',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workflow List */}
      {filteredWorkflows.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '16px', color: '#6b7280', margin: '0 0 8px 0' }}>
            워크플로우가 없습니다
          </p>
          <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
            새 워크플로우를 생성하여 시작하세요
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredWorkflows.map((workflow) => {
            const statusStyle = getStatusColor(workflow.status)
            return (
              <div key={workflow.id} style={{
                backgroundColor: 'white',
                borderRadius: '10px',
                padding: '20px 24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'box-shadow 0.15s',
                cursor: 'pointer',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: statusStyle.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  ⚡
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#111827',
                    margin: '0 0 4px 0',
                  }}>
                    {workflow.name}
                  </p>
                  {workflow.description && (
                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {workflow.description}
                    </p>
                  )}
                </div>
                <div style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  backgroundColor: statusStyle.bg,
                  flexShrink: 0,
                }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: statusStyle.text }}>
                    {statusStyle.label}
                  </span>
                </div>
                {workflow.createdAt && (
                  <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
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
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', margin: '0 0 24px 0' }}>
              새 워크플로우 생성
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                이름 *
              </label>
              <input
                type="text"
                value={newWorkflow.name}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                placeholder="워크플로우 이름을 입력하세요"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151', display: 'block', marginBottom: '6px' }}>
                설명
              </label>
              <textarea
                value={newWorkflow.description}
                onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                placeholder="워크플로우 설명을 입력하세요"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewWorkflow({ name: '', description: '' })
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newWorkflow.name.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: creating || !newWorkflow.name.trim() ? '#9ca3af' : '#111827',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: creating || !newWorkflow.name.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
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
