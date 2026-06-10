/**
 * Result Domain Model
 * 결과 기록을 위한 도메인 모델
 */

export interface Result {
  id: string;
  taskId: string;
  phase: string;
  type: ResultType;
  status: ResultStatus;
  content: ResultContent;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

export type ResultType = 
  | 'success'
  | 'failure'
  | 'partial'
  | 'deferred';

export type ResultStatus = 
  | 'draft'
  | 'submitted'
  | 'reviewed'
  | 'approved';

export interface ResultContent {
  summary: string;
  changes: Change[];
  files: FileChange[];
  commits: CommitInfo[];
  issues: Issue[];
}

export interface Change {
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface FileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  lines?: number;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: Date;
}

export interface Issue {
  type: 'blocker' | 'warning' | 'info';
  description: string;
  resolution?: string;
}

export interface ResultCreationRequest {
  taskId: string;
  phase: string;
  type: ResultType;
  content: ResultContent;
}

export interface ResultUpdateRequest {
  status?: ResultStatus;
  content?: Partial<ResultContent>;
}
