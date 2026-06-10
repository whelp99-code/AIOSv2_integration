/**
 * Task Domain Model
 * 작업 관리를 위한 도메인 모델
 */

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: AgentType;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dependencies: string[];
  metadata: Record<string, unknown>;
}

export type TaskStatus = 
  | 'backlog'
  | 'ready'
  | 'in-progress'
  | 'done'
  | 'blocked'
  | 'deferred';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type AgentType = 'hermes' | 'opencode' | 'manual';

export interface TaskCreationRequest {
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  assignee: AgentType;
  dependencies?: string[];
}

export interface TaskUpdateRequest {
  status?: TaskStatus;
  priority?: Priority;
  assignee?: AgentType;
  metadata?: Record<string, unknown>;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  output: unknown;
  completedAt: Date;
  duration: number;
}
