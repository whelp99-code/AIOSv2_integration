import { NextResponse } from 'next/server'
import type { AgentType, ApprovalActionType, ApprovalRequest, CollaborationAssignment } from '@aios/domain'
import {
  createCursorRuntime,
  createOpencodeRuntime,
} from '@aios/infrastructure'
import { getCollaborationServices } from '../../../../lib/collaboration/server'

type CollaborationExecuteTool = 'cursor' | 'opencode'

function normalizeActionType(value: unknown): ApprovalActionType {
  if (value === 'delete' || value === 'send' || value === 'deploy' || value === 'external-share') {
    return value
  }
  return 'deploy'
}

function getRuntime(tool: CollaborationExecuteTool) {
  return tool === 'opencode'
    ? createOpencodeRuntime(process.cwd())
    : createCursorRuntime(process.cwd())
}

function getAgentType(tool: CollaborationExecuteTool): AgentType {
  return tool === 'opencode' ? 'opencode' : 'manual'
}

function getCommandMetadata(job: { metadata: Record<string, unknown>; output?: { result: unknown } | undefined; error?: string }) {
  return {
    command: typeof job.metadata.command === 'string' ? job.metadata.command : '',
    exitCode: typeof job.metadata.exitCode === 'number' ? job.metadata.exitCode : undefined,
    summary: typeof job.output?.result === 'string' ? job.output.result : job.error || '',
  }
}

async function createApprovalRequests(input: {
  sessionId: string
  assignment: CollaborationAssignment
  requestedBy: string
  actionTypes: string[]
}) {
  const { approvalStore, coordinator } = getCollaborationServices()
  const approvals: ApprovalRequest[] = []

  for (const action of input.actionTypes) {
    const actionType = normalizeActionType(action)
    const approval = await approvalStore.create({
      type: 'destructive-action',
      sessionId: input.sessionId,
      assignmentId: input.assignment.id,
      requester: input.requestedBy,
      requestedBy: input.requestedBy,
      actionType,
      target: input.assignment.targetFiles.join(', ') || input.assignment.title,
      context: {
        assignmentTitle: input.assignment.title,
      },
      status: 'pending',
    })
    approvals.push(approval)
  }

  await coordinator.updateAssignment(input.sessionId, input.assignment.id, {
    status: 'waiting-for-approval',
    metadata: {
      approvalIds: approvals.map((approval) => approval.id),
      approvalStatus: 'pending',
    },
  })

  await coordinator.addArtifact(input.sessionId, {
    type: 'approval-record',
    path: '',
    description: `Approval requested for ${input.assignment.title}`,
    createdAt: new Date(),
    metadata: {
      assignmentId: input.assignment.id,
      approvalIds: approvals.map((approval) => approval.id),
      requestedBy: input.requestedBy,
      actionTypes: approvals.map((approval) => approval.actionType),
      status: 'pending',
    },
  })

  return approvals
}

export async function POST(request: Request) {
  try {
    const { coordinator, approvalStore, evidenceWriter } = getCollaborationServices()
    const body = await request.json()
    const sessionId = body.sessionId as string
    const tool = (body.tool ?? 'opencode') as CollaborationExecuteTool
    const taskTitle = body.taskTitle ?? 'AIOS collaboration task'
    const taskPrompt = body.taskPrompt ?? taskTitle
    const targetFiles = Array.isArray(body.targetFiles) ? body.targetFiles : []
    const resumeAssignmentId = typeof body.resumeAssignmentId === 'string' ? body.resumeAssignmentId : undefined
    const requestedApprovalTypes = Array.isArray(body.requiredApprovals) ? body.requiredApprovals : []

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const existingSession = await coordinator.getSession(sessionId)
    if (!existingSession) {
      return NextResponse.json({ error: '세션을 찾을 수 없습니다.' }, { status: 404 })
    }

    let assignment: CollaborationAssignment
    if (resumeAssignmentId) {
      const existingAssignment = await coordinator.getAssignment(sessionId, resumeAssignmentId)
      if (!existingAssignment) {
        return NextResponse.json({ error: 'assignment를 찾을 수 없습니다.' }, { status: 404 })
      }

      const approvals = await approvalStore.list()
      const unresolved = approvals.filter(
        (approval) =>
          approval.sessionId === sessionId &&
          approval.assignmentId === resumeAssignmentId &&
          approval.status === 'pending',
      )
      const rejected = approvals.some(
        (approval) =>
          approval.sessionId === sessionId &&
          approval.assignmentId === resumeAssignmentId &&
          (approval.status === 'rejected' || approval.status === 'deferred'),
      )

      if (unresolved.length > 0) {
        return NextResponse.json(
          {
            success: false,
            assignment: existingAssignment,
            approvalStatus: 'pending',
            error: '미해결 승인 요청이 남아 있습니다.',
          },
          { status: 409 },
        )
      }

      if (rejected) {
        return NextResponse.json(
          {
            success: false,
            assignment: existingAssignment,
            approvalStatus: 'rejected',
            error: '반려 또는 보류된 승인 건은 재실행할 수 없습니다. 새 승인 요청이 필요합니다.',
          },
          { status: 403 },
        )
      }

      assignment = await coordinator.updateAssignment(sessionId, resumeAssignmentId, {
        status: 'queued',
        metadata: {
          lastRetryAt: new Date().toISOString(),
          approvalStatus: 'approved',
        },
      })
    } else {
      assignment = await coordinator.addAssignment(sessionId, {
        title: taskTitle,
        description: taskPrompt,
        assignedTo: tool,
        role: tool === 'opencode' ? 'implementer' : 'orchestrator',
        targetFiles,
        requiredApprovals: requestedApprovalTypes,
        metadata: {
          trigger: 'api',
          approvalMode: body.approvalMode ?? 'manual',
          actionType: body.actionType ?? null,
        },
      })
    }

    if (!resumeAssignmentId && requestedApprovalTypes.length > 0) {
      const approvals = await createApprovalRequests({
        sessionId,
        assignment,
        requestedBy: tool,
        actionTypes: requestedApprovalTypes,
      })
      const session = await coordinator.getSession(sessionId)
      if (session) {
        await evidenceWriter.writeSessionSummary(session, await approvalStore.list())
      }

      return NextResponse.json({
        success: false,
        assignment: await coordinator.getAssignment(sessionId, assignment.id),
        approvalStatus: 'pending',
        approvals,
        sessionStatus: session?.status ?? 'waiting-for-review',
      })
    }

    const runtime = getRuntime(tool)
    await runtime.initialize()
    assignment = await coordinator.updateAssignment(sessionId, assignment.id, {
      status: 'running',
      metadata: {
        startedBy: tool,
        startedAt: new Date().toISOString(),
      },
    })

    const job = await runtime.executeJob({
      taskId: assignment.id,
      agentType: getAgentType(tool),
      input: {
        task: taskPrompt,
        context: {
          sessionId,
          targetFiles,
          assignmentId: assignment.id,
        },
        constraints: Array.isArray(body.constraints) ? body.constraints : [],
      },
    })

    await runtime.shutdown()

    const commandMetadata = getCommandMetadata(job)
    const assignmentStatus = job.status === 'completed' ? 'done' : 'failed'
    assignment = await coordinator.updateAssignment(sessionId, assignment.id, {
      status: assignmentStatus,
      metadata: {
        jobId: job.id,
        command: commandMetadata.command,
        exitCode: commandMetadata.exitCode,
        summary: commandMetadata.summary,
        error: job.error,
        completedAt: new Date().toISOString(),
      },
    })

    await coordinator.addArtifact(sessionId, {
      type: 'log',
      path: '',
      description: `${tool} execution result`,
      createdAt: new Date(),
      metadata: {
        assignmentId: assignment.id,
        jobId: job.id,
        status: job.status,
        command: commandMetadata.command,
        exitCode: commandMetadata.exitCode,
        summary: commandMetadata.summary,
        error: job.error,
      },
    })

    if (job.status === 'completed' && tool === 'cursor') {
      await coordinator.addHandoff(sessionId, {
        from: 'cursor',
        to: 'opencode',
        reason: 'execution-complete',
        summary: 'Cursor orchestration step completed. opencode follow-up implementation queued.',
      })

      await coordinator.addAssignment(sessionId, {
        title: `${taskTitle} follow-up implementation`,
        description: `Cursor output review completed. Continue implementation for: ${taskPrompt}`,
        assignedTo: 'opencode',
        role: 'implementer',
        targetFiles,
        metadata: {
          sourceAssignmentId: assignment.id,
          trigger: 'cursor-handoff',
        },
      })
    }

    const session = await coordinator.getSession(sessionId)
    const approvals = await approvalStore.list()
    if (session) {
      await evidenceWriter.writeSessionSummary(session, approvals)
    }

    return NextResponse.json({
      success: job.status === 'completed',
      assignment,
      job,
      sessionStatus: session?.status ?? existingSession.status,
      approvalStatus: 'not-required',
    })
  } catch (error) {
    console.error('Collaboration execute error:', error)
    return NextResponse.json(
      {
        error: '협업 실행에 실패했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
