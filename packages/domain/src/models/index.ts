/**
 * Domain Models Index
 * 도메인 패키지 메인 내보내기
 */

// Project models
export type { 
  Project, 
  ProjectStatus, 
  ProjectIntakeRequest, 
  ProjectIntakeResult 
} from './project';

// Task models
export type { 
  Task, 
  TaskStatus, 
  Priority,
  AgentType,
  TaskCreationRequest, 
  TaskUpdateRequest, 
  TaskResult 
} from './task';

// Agent Job models
export type { 
  AgentJob, 
  JobStatus, 
  JobInput, 
  JobOutput, 
  Artifact, 
  AgentJobCreationRequest, 
  AgentJobUpdateRequest 
} from './agent-job';

// Result models
export type { 
  Result, 
  ResultType, 
  ResultStatus, 
  ResultContent, 
  Change, 
  FileChange, 
  CommitInfo, 
  Issue, 
  ResultCreationRequest, 
  ResultUpdateRequest 
} from './result';

// Approval Policy models
export type { 
  ApprovalPolicy, 
  ApprovalRule, 
  ApprovalAction, 
  AutoApprovalConfig, 
  AutoApprovalCondition, 
  ApprovalRequest, 
  ApprovalType, 
  ApprovalActionType,
  ApprovalStatus, 
  ApprovalDecision 
} from './approval-policy';
export { AUTO_APPROVAL_EXCLUSIONS, APPROVAL_ACTION_TYPES, isApprovalActionType, normalizeApprovalActionType } from './approval-policy';

// Deferred Item models
export type { 
  DeferredItem, 
  DeferredReason, 
  DeferredItemCreationRequest, 
  DeferredItemResolutionRequest, 
  DeferredItemFilter 
} from './deferred-item';
export { DEFERRED_REASONS } from './deferred-item';

// Workflow State models
export type { 
  WorkflowState, 
  WorkflowPhase, 
  WorkflowStatus, 
  WorkflowTaskState, 
  WorkflowTransition, 
  WorkflowProgress 
} from './workflow-state';
export { WORKFLOW_TRANSITIONS } from './workflow-state';

// Collaboration Session models
export type {
  CollaborationTool,
  CollaborationRole,
  CollaborationSessionStatus,
  CollaborationParticipant,
  CollaborationAssignment,
  CollaborationHandoff,
  CollaborationArtifact,
  CollaborationSession,
  CollaborationWorkspaceProject,
  CollaborationWorkspaceState,
  CollaborationSessionCreateRequest,
  CollaborationSessionUpdateRequest,
  CollaborationAssignmentCreateRequest,
  CollaborationHandoffCreateRequest,
} from './collaboration-session';
export {
  createDefaultCollaborationParticipants,
  createCollaborationWorkspaceProjects,
} from './collaboration-defaults';
