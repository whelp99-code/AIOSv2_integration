/**
 * Collaboration Session Domain Model
 * Cursor, opencode, Codex 세션 간 협업 상태를 추적하는 도메인 모델
 */

export type CollaborationTool = 'cursor' | 'opencode' | 'codex' | 'hermes' | 'manual';

export type CollaborationRole = 'orchestrator' | 'implementer' | 'reviewer' | 'observer';

export type CollaborationSessionStatus =
  | 'planned'
  | 'in-progress'
  | 'waiting-for-review'
  | 'blocked'
  | 'deferred'
  | 'completed';

export interface CollaborationParticipant {
  tool: CollaborationTool;
  role: CollaborationRole;
  displayName: string;
  active: boolean;
  capabilities: string[];
}

export interface CollaborationAssignment {
  id: string;
  title: string;
  description: string;
  assignedTo: CollaborationTool;
  role: CollaborationRole;
  targetFiles: string[];
  requiredApprovals: string[];
  status: 'queued' | 'running' | 'waiting-for-approval' | 'done' | 'failed' | 'deferred';
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface CollaborationHandoff {
  id: string;
  from: CollaborationTool;
  to: CollaborationTool;
  reason: string;
  summary: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface CollaborationArtifact {
  type: 'plan' | 'code' | 'doc' | 'test' | 'review' | 'log' | 'patch-summary' | 'test-result' | 'approval-record';
  path: string;
  description: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export interface CollaborationSession {
  id: string;
  title: string;
  objective: string;
  status: CollaborationSessionStatus;
  owner: CollaborationTool;
  participants: CollaborationParticipant[];
  assignments: CollaborationAssignment[];
  handoffs: CollaborationHandoff[];
  artifacts: CollaborationArtifact[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export interface CollaborationWorkspaceProject {
  name: string;
  path: string;
  description: string;
  integrationRole: string;
  status: 'active' | 'planned' | 'blocked' | 'deferred';
}

export interface CollaborationWorkspaceState {
  schemaVersion: number;
  workspaceRoot: string;
  lastUpdatedAt: string;
  projects: CollaborationWorkspaceProject[];
  sessions: CollaborationSession[];
}

export interface CollaborationSessionCreateRequest {
  title: string;
  objective: string;
  owner: CollaborationTool;
  participants: CollaborationParticipant[];
  metadata?: Record<string, unknown>;
}

export interface CollaborationSessionUpdateRequest {
  title?: string;
  objective?: string;
  status?: CollaborationSessionStatus;
  owner?: CollaborationTool;
  metadata?: Record<string, unknown>;
}

export interface CollaborationAssignmentCreateRequest {
  title: string;
  description: string;
  assignedTo: CollaborationTool;
  role: CollaborationRole;
  targetFiles: string[];
  requiredApprovals?: string[];
  metadata?: Record<string, unknown>;
}

export interface CollaborationHandoffCreateRequest {
  from: CollaborationTool;
  to: CollaborationTool;
  reason: string;
  summary: string;
  metadata?: Record<string, unknown>;
}
