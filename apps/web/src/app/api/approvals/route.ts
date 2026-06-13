import { NextResponse } from 'next/server'
import type { ApprovalActionType, ApprovalStatus } from '@aios/domain'
import { getCollaborationServices } from '../../../lib/collaboration/server'

function isApprovalActionType(value: unknown): value is ApprovalActionType {
  return value === 'delete' || value === 'send' || value === 'deploy' || value === 'external-share'
}

function isResolutionStatus(value: unknown): value is Extract<ApprovalStatus, 'approved' | 'rejected' | 'deferred'> {
  return value === 'approved' || value === 'rejected' || value === 'deferred'
}

export async function GET() {
  try {
    const { approvalStore } = getCollaborationServices()
    const approvals = await approvalStore.list()
    return NextResponse.json({ approvals })
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
    const { approvalStore, coordinator, evidenceWriter } = getCollaborationServices()
    const body = await request.json()

    if (body.approvalId && body.status) {
      if (!isResolutionStatus(body.status)) {
        return NextResponse.json({ error: '유효하지 않은 승인 상태입니다.' }, { status: 400 })
      }

      const approval = await approvalStore.resolve(
        body.approvalId,
        body.status,
        body.resolvedBy || 'current-user',
        body.resolution || `${body.status} 처리되었습니다.`,
      )

      const session = await coordinator.getSession(approval.sessionId)
      if (session) {
        if (approval.status === 'rejected') {
          await coordinator.updateAssignment(approval.sessionId, approval.assignmentId, {
            status: 'failed',
            metadata: {
              approvalRejectedBy: approval.resolvedBy,
              approvalResolution: approval.resolution,
            },
          })
        }

        if (approval.status === 'deferred') {
          await coordinator.updateAssignment(approval.sessionId, approval.assignmentId, {
            status: 'deferred',
            metadata: {
              approvalDeferredBy: approval.resolvedBy,
              approvalResolution: approval.resolution,
            },
          })
        }

        await coordinator.addArtifact(approval.sessionId, {
          type: 'approval-record',
          path: '',
          description: `Approval ${approval.status} for ${approval.assignmentId}`,
          createdAt: new Date(),
          metadata: {
            approvalId: approval.id,
            assignmentId: approval.assignmentId,
            requestedBy: approval.requestedBy,
            resolvedBy: approval.resolvedBy,
            status: approval.status,
            actionType: approval.actionType,
            resolution: approval.resolution,
          },
        })

        const updatedSession = await coordinator.getSession(approval.sessionId)
        if (updatedSession) {
          const approvals = await approvalStore.list()
          await evidenceWriter.writeSessionSummary(updatedSession, approvals)
        }
      }

      return NextResponse.json({
        success: true,
        approval,
      })
    }

    if (!body.sessionId || !body.assignmentId || !isApprovalActionType(body.actionType)) {
      return NextResponse.json(
        { error: 'sessionId, assignmentId, actionType는 필수입니다.' },
        { status: 400 }
      )
    }

    const approval = await approvalStore.create({
      type: body.type || 'destructive-action',
      sessionId: body.sessionId,
      assignmentId: body.assignmentId,
      requester: body.requester || body.requestedBy || 'current-user',
      requestedBy: body.requestedBy || body.requester || 'current-user',
      actionType: body.actionType,
      target: body.target || 'unknown',
      context: body.context || {},
      status: 'pending',
    })

    await coordinator.addArtifact(body.sessionId, {
      type: 'approval-record',
      path: '',
      description: `Approval requested for ${body.assignmentId}`,
      createdAt: new Date(),
      metadata: {
        approvalId: approval.id,
        assignmentId: body.assignmentId,
        requestedBy: approval.requestedBy,
        status: approval.status,
        actionType: approval.actionType,
      },
    })

    return NextResponse.json({
      success: true,
      approval,
      message: '승인 요청이 생성되었습니다.',
    })
  } catch (error) {
    console.error('Approval action error:', error)
    if (error instanceof Error && error.message.includes('Approval not found')) {
      return NextResponse.json(
        { error: '승인 요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: '승인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
