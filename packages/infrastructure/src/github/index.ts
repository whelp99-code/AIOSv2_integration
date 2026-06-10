/**
 * GitHub Package Index
 * GitHub 패키지 메인 내보내기
 */

// Repository Adapter
export type { 
  IGitHubRepositoryAdapter,
  BranchResult,
  BranchInfo,
  CommitResult,
  CommitInfo,
  FileChange,
  PRResult,
  PRStatus,
  ReviewInfo,
  CheckInfo
} from './repository-adapter';

// Branch Command
export type {
  BranchCreationCommand,
  BranchPrefix,
  BranchNamingConvention,
  ParsedBranchName
} from './branch-command';
export { PhaseBranchNaming, PHASE_BRANCHES } from './branch-command';

// Commit Metadata
export type {
  CommitMetadata,
  CommitAuthor,
  CommitMessageTemplate,
  CommitType,
  CommitMessageGenerator
} from './commit-metadata';
export { PhaseCommitMessageGenerator, PHASE_COMMIT_MESSAGES } from './commit-metadata';

// PR Request
export type {
  PRCreationRequest,
  PRUpdateRequest,
  PRStatusTracking,
  PRReview,
  PRCheck
} from './pr-request';
export { PRMetadataGenerator } from './pr-request';
