/**
 * Approval Policy Domain Model
 * 승인 정책을 위한 도메인 모델
 */

export interface ApprovalPolicy {
  id: string;
  name: string;
  description: string;
  rules: ApprovalRule[];
  autoApproval: AutoApprovalConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalRule {
  id: string;
  condition: string;
  action: ApprovalAction;
  priority: number;
}

export type ApprovalAction = 
  | 'auto-approve'
  | 'require-review'
  | 'block'
  | 'defer';

export interface AutoApprovalConfig {
  enabled: boolean;
  conditions: AutoApprovalCondition[];
  exclusions: string[];
}

export interface AutoApprovalCondition {
  type: 'file-pattern' | 'commit-message' | 'branch-name' | 'custom';
  pattern: string;
  description: string;
}

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  requester: string;
  target: string;
  context: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export type ApprovalType = 
  | 'file-change'
  | 'commit'
  | 'pr-create'
  | 'pr-merge'
  | 'deployment'
  | 'data-access';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'deferred';

export interface ApprovalDecision {
  requestId: string;
  decision: ApprovalStatus;
  reason: string;
  decidedBy: string;
  decidedAt: Date;
}

// Auto-approval exclusions
export const AUTO_APPROVAL_EXCLUSIONS = [
  'operational-deployment',
  'database-migration',
  'data-deletion',
  'secret-exposure',
  'external-api-billing',
  'main-branch-push',
  'user-data-destruction'
] as const;
