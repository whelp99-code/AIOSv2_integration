/**
 * Collaboration Session File Store
 * .aios/context 기반 세션 상태 저장소
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { resolveAiosWorkspaceRoot } from './workspace-root';
import {
  createCollaborationWorkspaceProjects,
  createDefaultCollaborationParticipants,
} from '@aios/domain';
import type {
  CollaborationAssignment,
  CollaborationArtifact,
  CollaborationHandoff,
  CollaborationParticipant,
  CollaborationSession,
  CollaborationSessionStatus,
  CollaborationWorkspaceProject,
  CollaborationWorkspaceState,
} from '@aios/domain';

export interface CollaborationStateStoreConfig {
  filePath?: string;
  workspaceRoot?: string;
}

const DEFAULT_FILE_PATH =
  process.env.AIOS_COLLABORATION_STATE_PATH ??
  join(resolveAiosWorkspaceRoot(), '.aios', 'context', 'collaboration-state.json');

export class CollaborationSessionFileStore {
  private readonly filePath: string;
  private readonly workspaceRoot: string;

  constructor(config: CollaborationStateStoreConfig = {}) {
    this.filePath = config.filePath ?? DEFAULT_FILE_PATH;
    this.workspaceRoot = config.workspaceRoot ?? process.cwd();
  }

  async loadState(): Promise<CollaborationWorkspaceState> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return this.parseState(raw);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const state = this.createDefaultState();
        await this.saveState(state);
        return state;
      }

      throw error;
    }
  }

  async saveState(state: CollaborationWorkspaceState): Promise<void> {
    const targetDir = dirname(this.filePath);
    await mkdir(targetDir, { recursive: true });

    const normalizedState = this.normalizeState(state);
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(normalizedState, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.filePath);
  }

  private createDefaultState(): CollaborationWorkspaceState {
    return {
      schemaVersion: 1,
      workspaceRoot: this.workspaceRoot,
      lastUpdatedAt: new Date().toISOString(),
      projects: createCollaborationWorkspaceProjects(this.workspaceRoot),
      sessions: [
        {
          id: 'cursor-opencode-main-session',
          title: 'Cursor + opencode multi-session collaboration',
          objective: 'Cursor와 opencode가 같은 상태를 읽고 서로 넘겨받으며 AIOS v1, F-aios-v3-core, sangfor-mcp-workflow, vibe-coding-os, whelp99-code-sangfor-engineer-mcp 연동을 진행한다.',
          status: 'in-progress',
          owner: 'cursor',
          participants: createDefaultCollaborationParticipants(),
          assignments: [
            {
              id: 'assignment-bootstrap-plan',
              title: '공통 연동 계획 구체화',
              description: '세션별 역할과 승인 게이트, 상태 저장소를 공유 규약으로 고정한다.',
              assignedTo: 'cursor',
              role: 'orchestrator',
              targetFiles: ['.aios/context/collaboration-state.json', 'docs/reports/cursor-opencode-collaboration.md'],
              requiredApprovals: ['external-sharing', 'deployment'],
              status: 'done',
              createdAt: new Date(),
              updatedAt: new Date(),
              metadata: { phase: 'planning' },
            },
          ],
          handoffs: [
            {
              id: 'handoff-cursor-to-opencode',
              from: 'cursor',
              to: 'opencode',
              reason: '구체 구현 반영',
              summary: 'Cursor가 협업 규약과 작업 분해를 잡고, opencode가 실제 구현과 테스트를 진행한다.',
              createdAt: new Date(),
              metadata: { sharedState: true },
            },
          ],
          artifacts: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            activeProjects: ['AIOS v1', 'F-aios-v3-core', 'sangfor-mcp-workflow', 'vibe-coding-os', 'whelp99-code-sangfor-engineer-mcp'],
          },
        },
      ],
    };
  }

  private parseState(raw: string): CollaborationWorkspaceState {
    const parsed = JSON.parse(raw) as CollaborationWorkspaceState;
    return this.normalizeState(parsed);
  }

  private normalizeState(state: CollaborationWorkspaceState): CollaborationWorkspaceState {
    return {
      schemaVersion: state.schemaVersion ?? 1,
      workspaceRoot: state.workspaceRoot ?? this.workspaceRoot,
      lastUpdatedAt: state.lastUpdatedAt ?? new Date().toISOString(),
      projects: (state.projects ?? []).map((project) => this.normalizeProject(project)),
      sessions: (state.sessions ?? []).map((session) => this.normalizeSession(session)),
    };
  }

  private normalizeProject(project: CollaborationWorkspaceProject): CollaborationWorkspaceProject {
    return {
      name: project.name,
      path: project.path,
      description: project.description,
      integrationRole: project.integrationRole,
      status: project.status,
    };
  }

  private normalizeSession(session: CollaborationSession): CollaborationSession {
    return {
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      participants: session.participants.map((participant) => this.normalizeParticipant(participant)),
      assignments: session.assignments.map((assignment) => this.normalizeAssignment(assignment)),
      handoffs: session.handoffs.map((handoff) => this.normalizeHandoff(handoff)),
      artifacts: session.artifacts.map((artifact) => this.normalizeArtifact(artifact)),
    };
  }

  private normalizeParticipant(participant: CollaborationParticipant): CollaborationParticipant {
    return {
      ...participant,
      capabilities: [...participant.capabilities],
    };
  }

  private normalizeAssignment(assignment: CollaborationAssignment): CollaborationAssignment {
    const status = String(assignment.status) === 'in-progress' ? 'running' : assignment.status;
    return {
      ...assignment,
      status,
      targetFiles: [...assignment.targetFiles],
      requiredApprovals: [...assignment.requiredApprovals],
      createdAt: new Date(assignment.createdAt),
      updatedAt: new Date(assignment.updatedAt),
    };
  }

  private normalizeHandoff(handoff: CollaborationHandoff): CollaborationHandoff {
    return {
      ...handoff,
      createdAt: new Date(handoff.createdAt),
      acknowledgedAt: handoff.acknowledgedAt ? new Date(handoff.acknowledgedAt) : undefined,
    };
  }

  private normalizeArtifact(artifact: CollaborationArtifact): CollaborationArtifact {
    return {
      ...artifact,
      createdAt: new Date(artifact.createdAt),
    };
  }
}

export function isCollaborationSessionStatus(status: string): status is CollaborationSessionStatus {
  return ['planned', 'in-progress', 'waiting-for-review', 'blocked', 'deferred', 'completed'].includes(status);
}

