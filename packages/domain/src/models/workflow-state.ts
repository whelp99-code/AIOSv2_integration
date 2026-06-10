/**
 * Workflow State Domain Model
 * 워크플로우 상태 관리를 위한 도메인 모델
 */

export interface WorkflowState {
  id: string;
  projectId: string;
  phase: WorkflowPhase;
  status: WorkflowStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tasks: WorkflowTaskState[];
  metadata: Record<string, unknown>;
}

export type WorkflowPhase = 
  | 'phase-1'
  | 'phase-2'
  | 'phase-3'
  | 'phase-4'
  | 'phase-5'
  | 'phase-6'
  | 'phase-7';

export type WorkflowStatus = 
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'blocked'
  | 'deferred';

export interface WorkflowTaskState {
  taskId: string;
  status: TaskStatus;
  assignee: AgentType;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
}

export type TaskStatus = 
  | 'backlog'
  | 'ready'
  | 'in-progress'
  | 'done'
  | 'blocked'
  | 'deferred';

export type AgentType = 'hermes' | 'opencode' | 'manual';

export interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  condition: string;
  action: string;
}

export interface WorkflowProgress {
  phase: WorkflowPhase;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  deferredTasks: number;
  progress: number; // 0-100
}

// Valid workflow transitions
export const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  { from: 'not-started', to: 'in-progress', condition: 'All prerequisites met', action: 'Start workflow' },
  { from: 'in-progress', to: 'completed', condition: 'All tasks completed', action: 'Complete workflow' },
  { from: 'in-progress', to: 'blocked', condition: 'Critical blocker exists', action: 'Block workflow' },
  { from: 'in-progress', to: 'deferred', condition: 'External dependency required', action: 'Defer workflow' },
  { from: 'blocked', to: 'in-progress', condition: 'Blocker resolved', action: 'Resume workflow' },
  { from: 'deferred', to: 'in-progress', condition: 'Dependency resolved', action: 'Resume workflow' }
];
