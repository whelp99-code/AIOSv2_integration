import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ApprovalRequest, CollaborationSession } from '@aios/domain';
import { resolveAiosWorkspaceRoot } from './workspace-root';

export interface CollaborationEvidenceWriterConfig {
  outputDir?: string;
}

const DEFAULT_OUTPUT_DIR =
  process.env.AIOS_COLLABORATION_EVIDENCE_DIR ?? join(resolveAiosWorkspaceRoot(), 'docs', 'evidence');

export class CollaborationEvidenceWriter {
  private readonly outputDir: string;

  constructor(config: CollaborationEvidenceWriterConfig = {}) {
    this.outputDir = config.outputDir ?? DEFAULT_OUTPUT_DIR;
  }

  async writeSessionSummary(session: CollaborationSession, approvals: ApprovalRequest[]): Promise<string> {
    await mkdir(this.outputDir, { recursive: true });
    const filePath = join(this.outputDir, `${session.id}.md`);
    const sessionApprovals = approvals.filter((approval) => approval.sessionId === session.id);
    const content = [
      `# Collaboration Session Summary`,
      ``,
      `## objective`,
      session.objective,
      ``,
      `## participants`,
      ...session.participants.map((participant) => `- ${participant.displayName} (${participant.tool} / ${participant.role})`),
      ``,
      `## assignments executed`,
      ...session.assignments.map((assignment) => `- ${assignment.title} | ${assignment.assignedTo} | ${assignment.status}`),
      ``,
      `## approvals requested/resolved`,
      ...(sessionApprovals.length > 0
        ? sessionApprovals.map(
            (approval) =>
              `- ${approval.assignmentId} | ${approval.actionType} | ${approval.status} | ${approval.target}`,
          )
        : ['- none']),
      ``,
      `## failures and retry result`,
      ...session.assignments
        .filter((assignment) => assignment.status === 'failed' || assignment.metadata.lastRetryAt)
        .map((assignment) => `- ${assignment.title} | status=${assignment.status} | retry=${String(assignment.metadata.lastRetryAt ?? 'none')}`),
      ...(session.assignments.some((assignment) => assignment.status === 'failed' || assignment.metadata.lastRetryAt)
        ? []
        : ['- none']),
      ``,
      `## remaining work`,
      ...session.assignments
        .filter((assignment) => assignment.status !== 'done')
        .map((assignment) => `- ${assignment.title} | ${assignment.status}`),
      ...(session.assignments.some((assignment) => assignment.status !== 'done') ? [] : ['- none']),
      ``,
    ].join('\n');

    await writeFile(filePath, content, 'utf8');
    return filePath;
  }
}
