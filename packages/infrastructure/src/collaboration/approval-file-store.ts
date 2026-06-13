/**
 * Approval Queue File Store
 * 승인 큐를 .aios/context 파일로 지속화한다.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import type { ApprovalActionType, ApprovalRequest, ApprovalStatus } from '@aios/domain';

export interface ApprovalFileStoreConfig {
  filePath?: string;
}

const DEFAULT_APPROVALS_PATH = process.env.AIOS_APPROVAL_QUEUE_PATH ?? join(process.cwd(), '.aios', 'context', 'approval-queue.json');

export interface ApprovalQueueState {
  schemaVersion: number;
  lastUpdatedAt: string;
  approvals: ApprovalRequest[];
}

export class ApprovalFileStore {
  private readonly filePath: string;

  constructor(config: ApprovalFileStoreConfig = {}) {
    this.filePath = config.filePath ?? DEFAULT_APPROVALS_PATH;
  }

  async list(): Promise<ApprovalRequest[]> {
    const state = await this.loadState();
    return state.approvals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(request: Omit<ApprovalRequest, 'id' | 'createdAt'>): Promise<ApprovalRequest> {
    const state = await this.loadState();
    const approval: ApprovalRequest = {
      ...request,
      id: `approval-${randomUUID()}`,
      createdAt: new Date(),
    };

    state.approvals.push(approval);
    state.lastUpdatedAt = new Date().toISOString();
    await this.saveState(state);
    return approval;
  }

  async resolve(approvalId: string, status: Extract<ApprovalStatus, 'approved' | 'rejected' | 'deferred'>, resolvedBy: string, resolution: string): Promise<ApprovalRequest> {
    const state = await this.loadState();
    const approval = state.approvals.find((entry) => entry.id === approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }

    approval.status = status;
    approval.resolvedAt = new Date();
    approval.resolvedBy = resolvedBy;
    approval.resolution = resolution;

    state.lastUpdatedAt = new Date().toISOString();
    await this.saveState(state);
    return approval;
  }

  private async loadState(): Promise<ApprovalQueueState> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as ApprovalQueueState;
      return {
        schemaVersion: parsed.schemaVersion ?? 1,
        lastUpdatedAt: parsed.lastUpdatedAt ?? new Date().toISOString(),
        approvals: (parsed.approvals ?? []).map((entry) => ({
          ...entry,
          sessionId: entry.sessionId ?? 'legacy-session',
          assignmentId: entry.assignmentId ?? 'legacy-assignment',
          requestedBy: entry.requestedBy ?? entry.requester ?? 'unknown',
          actionType: normalizeApprovalActionType(entry.actionType),
          createdAt: new Date(entry.createdAt),
          resolvedAt: entry.resolvedAt ? new Date(entry.resolvedAt) : undefined,
        })),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        const state = createDefaultApprovalState();
        await this.saveState(state);
        return state;
      }
      throw error;
    }
  }

  private async saveState(state: ApprovalQueueState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.filePath);
  }
}

function createDefaultApprovalState(): ApprovalQueueState {
  return {
    schemaVersion: 1,
    lastUpdatedAt: new Date().toISOString(),
    approvals: [
      {
        id: `approval-${randomUUID()}`,
        type: 'file-change',
        sessionId: 'cursor-opencode-main-session',
        assignmentId: 'assignment-bootstrap-plan',
        requester: 'cursor',
        requestedBy: 'cursor',
        actionType: 'external-share',
        target: '.aios/context/collaboration-state.json',
        context: { action: 'modify', reason: 'session registry update' },
        status: 'pending',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        id: `approval-${randomUUID()}`,
        type: 'deployment',
        sessionId: 'cursor-opencode-main-session',
        assignmentId: 'assignment-bootstrap-plan',
        requester: 'opencode',
        requestedBy: 'opencode',
        actionType: 'deploy',
        target: 'staging environment',
        context: { environment: 'staging', version: '0.1.0' },
        status: 'approved',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 90 * 60 * 1000),
        resolvedBy: 'admin',
        resolution: 'Approved for staging deployment',
      },
    ],
  };
}

export function normalizeApprovalActionType(value: unknown): ApprovalActionType {
  if (value === 'delete' || value === 'send' || value === 'deploy' || value === 'external-share') {
    return value;
  }
  return 'deploy';
}
