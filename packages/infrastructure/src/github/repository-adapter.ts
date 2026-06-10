/**
 * GitHub Repository Adapter
 * GitHub 저장소 어댑터 인터페이스
 */

export interface IGitHubRepositoryAdapter {
  /**
   * 브랜치 생성
   */
  createBranch(branchName: string, baseBranch: string): Promise<BranchResult>;
  
  /**
   * 커밋 생성
   */
  createCommit(message: string, files: FileChange[]): Promise<CommitResult>;
  
  /**
   * PR 생성
   */
  createPR(request: PRCreateRequest): Promise<PRResult>;
  
  /**
   * PR 업데이트
   */
  updatePR(prId: string, request: PRUpdateRequest): Promise<PRResult>;
  
  /**
   * PR 상태 조회
   */
  getPRStatus(prId: string): Promise<PRStatus>;
  
  /**
   * 브랜치 목록 조회
   */
  listBranches(): Promise<BranchInfo[]>;
  
  /**
   * 커밋 히스토리 조회
   */
  getCommitHistory(branch: string, limit?: number): Promise<CommitInfo[]>;
}

export interface BranchResult {
  name: string;
  sha: string;
  created: boolean;
  message?: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
  lastCommit: Date;
}

export interface CommitResult {
  sha: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: Date;
  branch: string;
}

export interface FileChange {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface PRCreateRequest {
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  reviewers?: string[];
  labels?: string[];
}

export interface PRUpdateRequest {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  reviewers?: string[];
  labels?: string[];
}

export interface PRResult {
  id: number;
  number: number;
  title: string;
  url: string;
  state: string;
  created: boolean;
  message?: string;
}

export interface PRStatus {
  id: number;
  number: number;
  state: string;
  mergeable: boolean;
  mergeState: string;
  reviews: ReviewInfo[];
  checks: CheckInfo[];
}

export interface ReviewInfo {
  id: number;
  state: string;
  reviewer: string;
  submittedAt: Date;
}

export interface CheckInfo {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  startedAt: Date;
  completedAt?: Date;
}
