import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let tempRoot = ''
let ensureApprovedAction: typeof import('../apps/web/src/lib/integrations/approval-gate').ensureApprovedAction
let approvalsPost: typeof import('../apps/web/src/app/api/approvals/route').POST

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), 'aios-approval-gate-'))
  const approvalsPath = join(tempRoot, 'approval-queue.json')
  const collaborationStatePath = join(tempRoot, 'collaboration-state.json')
  const evidenceDir = join(tempRoot, 'evidence')

  process.env.AIOS_APPROVAL_QUEUE_PATH = approvalsPath
  process.env.AIOS_COLLABORATION_STATE_PATH = collaborationStatePath
  process.env.AIOS_COLLABORATION_EVIDENCE_DIR = evidenceDir

  await writeFile(approvalsPath, '[]\n', 'utf8')
  await writeFile(
    collaborationStatePath,
      JSON.stringify({
        schemaVersion: 1,
        projects: [],
        sessions: [{
          id: 'cursor-opencode-main-session',
          status: 'in-progress',
          objective: 'test',
          participants: [],
          assignments: [{
            id: 'test-assignment',
            title: 'test assignment',
            description: 'test assignment',
            assignedTo: 'opencode',
            role: 'implementer',
            targetFiles: ['apps/web/src/app/api/approvals/route.ts'],
            requiredApprovals: ['deploy'],
            status: 'queued',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {},
          }],
          handoffs: [],
          artifacts: [],
          metadata: { phase: 4 },
        }],
      }),
    'utf8',
  )

  vi.resetModules()

  const [approvalGateModule, approvalsRoute] = await Promise.all([
    import('../apps/web/src/lib/integrations/approval-gate'),
    import('../apps/web/src/app/api/approvals/route'),
  ])

  ensureApprovedAction = approvalGateModule.ensureApprovedAction
  approvalsPost = approvalsRoute.POST
})

afterEach(() => {
  delete process.env.AIOS_APPROVAL_QUEUE_PATH
  delete process.env.AIOS_COLLABORATION_STATE_PATH
  delete process.env.AIOS_COLLABORATION_EVIDENCE_DIR
  vi.resetModules()
})

describe('approval-gate', () => {
  it('returns 409 pending when approvalId is missing', async () => {
    const result = await ensureApprovedAction({
      assignmentId: 'test-assignment',
      requestedBy: 'test-user',
      actionType: 'deploy',
      target: 'sangfor workflow execute: wf-1',
    })

    expect(result.allowed).toBe(false)
    if (result.allowed) return

    expect(result.response.status).toBe(409)
    const body = await result.response.json()
    expect(body.approvalStatus).toBe('pending')
    expect(body.approval.actionType).toBe('deploy')
    expect(body.approval.status).toBe('pending')
  })

  it('allows upstream call after approval is resolved', async () => {
    const pending = await ensureApprovedAction({
      assignmentId: 'test-assignment',
      requestedBy: 'test-user',
      actionType: 'external-share',
      target: 'vibe-coding rag ingest: docs',
    })

    expect(pending.allowed).toBe(false)
    if (pending.allowed) return

    const pendingBody = await pending.response.json()
    const approvalId = pendingBody.approval.id as string

    const approveRes = await approvalsPost(new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalId,
        status: 'approved',
        resolvedBy: 'qa-user',
        resolution: 'approved in unit test',
      }),
    }))
    expect(approveRes.ok).toBe(true)

    const approved = await ensureApprovedAction({
      approvalId,
      assignmentId: 'test-assignment',
      requestedBy: 'test-user',
      actionType: 'external-share',
      target: 'vibe-coding rag ingest: docs',
    })

    expect(approved.allowed).toBe(true)
    if (!approved.allowed) return
    expect(approved.approval.status).toBe('approved')
  })

  it('blocks reassignment after approval is rejected', async () => {
    const pending = await ensureApprovedAction({
      assignmentId: 'test-assignment',
      requestedBy: 'test-user',
      actionType: 'deploy',
      target: 'sangfor workflow execute: wf-1',
    })

    expect(pending.allowed).toBe(false)
    if (pending.allowed) return

    const pendingBody = await pending.response.json()
    const approvalId = pendingBody.approval.id as string

    const rejectRes = await approvalsPost(new Request('http://localhost/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvalId,
        status: 'rejected',
        resolvedBy: 'qa-user',
        resolution: 'rejected in unit test',
      }),
    }))
    expect(rejectRes.ok).toBe(true)

    const rejected = await ensureApprovedAction({
      approvalId,
      assignmentId: 'test-assignment',
      requestedBy: 'test-user',
      actionType: 'deploy',
      target: 'sangfor workflow execute: wf-1',
    })

    expect(rejected.allowed).toBe(false)
    if (rejected.allowed) return
    expect(rejected.response.status).toBe(403)
    const body = await rejected.response.json()
    expect(body.approvalStatus).toBe('rejected')
  })
})
