import { join } from 'node:path'
import { AgentSessionCoordinator } from '@aios/application'
import {
  ApprovalFileStore,
  CollaborationEvidenceWriter,
  CollaborationSessionFileStore,
  resolveAiosWorkspaceRoot,
} from '@aios/infrastructure'

const workspaceRoot = resolveAiosWorkspaceRoot()

const sessionStore = new CollaborationSessionFileStore({
  workspaceRoot,
  filePath: process.env.AIOS_COLLABORATION_STATE_PATH ?? join(workspaceRoot, '.aios', 'context', 'collaboration-state.json'),
})
const approvalStore = new ApprovalFileStore({
  filePath: process.env.AIOS_APPROVAL_QUEUE_PATH ?? join(workspaceRoot, '.aios', 'context', 'approval-queue.json'),
})
const evidenceWriter = new CollaborationEvidenceWriter({
  outputDir: process.env.AIOS_COLLABORATION_EVIDENCE_DIR ?? join(workspaceRoot, 'docs', 'evidence'),
})
const coordinator = new AgentSessionCoordinator(sessionStore)

export function getCollaborationServices() {
  return {
    sessionStore,
    approvalStore,
    evidenceWriter,
    coordinator,
  }
}
