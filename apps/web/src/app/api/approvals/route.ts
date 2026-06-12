import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * In-memory Approval Store
 * AIOS v1에 approvals API가 없으므로 로컬 메모리 저장소 사용
 */

interface ApprovalRequest {
  id: string
  type: string
  requester: string
  target: string
  context: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'deferred'
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolution?: string
}

// In-memory store
const approvals: Map<string, ApprovalRequest> = new Map()

// Seed default data if empty
function seedDefaults() {
  if (approvals.size === 0) {
    const defaults: ApprovalRequest[] = [
      {
        id: randomUUID(),
        type: 'file-change',
        requester: 'ai-agent-1',
        target: 'src/config/production.yml',
        context: { action: 'modify', branch: 'feature/config-update' },
        status: 'pending',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: randomUUID(),
        type: 'pr-create',
        requester: 'ai-agent-2',
        target: 'feat/phase3-integration',
        context: { title: 'Phase 3 Integration PR', reviewers: ['dev-lead'] },
        status: 'pending',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: randomUUID(),
        type: 'deployment',
        requester: 'ci-pipeline',
        target: 'staging environment',
        context: { version: '0.1.0', environment: 'staging' },
        status: 'approved',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        resolvedAt: new Date(Date.now() - 6000000).toISOString(),
        resolvedBy: 'admin',
        resolution: 'Approved for staging deployment',
      },
    ]
    for (const a of defaults) {
      approvals.set(a.id, a)
    }
  }
}

export async function GET() {
  try {
    seedDefaults()
    const list = Array.from(approvals.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return NextResponse.json({ approvals: list })
  } catch (error) {
    console.error('Approvals error:', error)
    return NextResponse.json(
      { error: '승인 목록을 가져올 수 없습니다.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    seedDefaults()
    const body = await request.json()
    const { action, approvalId, type, requester, target, context } = body

    // Handle approve/reject action on existing approval
    if (action && approvalId) {
      const existing = approvals.get(approvalId)
      if (!existing) {
        return NextResponse.json(
          { error: '승인 요청을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      const statusMap: Record<string, 'approved' | 'rejected' | 'deferred'> = {
        approve: 'approved',
        reject: 'rejected',
        defer: 'deferred',
      }

      const newStatus = statusMap[action]
      if (!newStatus) {
        return NextResponse.json(
          { error: `유효하지 않은 액션: ${action}` },
          { status: 400 }
        )
      }

      existing.status = newStatus
      existing.resolvedAt = new Date().toISOString()
      existing.resolvedBy = 'current-user'
      existing.resolution = `${action} 처리되었습니다.`
      approvals.set(approvalId, existing)

      return NextResponse.json({
        success: true,
        approval: existing,
        message: `승인이 ${action === 'approve' ? '승인' : action === 'reject' ? '거부' : '보류'} 처리되었습니다.`,
      })
    }

    // Create new approval request
    const newApproval: ApprovalRequest = {
      id: randomUUID(),
      type: type || 'file-change',
      requester: requester || 'current-user',
      target: target || 'unknown',
      context: context || {},
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    approvals.set(newApproval.id, newApproval)

    return NextResponse.json({
      success: true,
      approval: newApproval,
      message: '승인 요청이 생성되었습니다.',
    })
  } catch (error) {
    console.error('Approval action error:', error)
    return NextResponse.json(
      { error: '승인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
