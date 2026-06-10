/**
 * opencode Role Contract
 * opencode 에이전트 역할 계약
 */

import type { 
  Task, 
  TaskResult,
  AgentJob,
  JobOutput,
  Artifact
} from '@aios/domain';

export interface IOpencodeRole {
  /**
   * 작업 실행
   */
  executeTask(task: Task): Promise<TaskResult>;
  
  /**
   * 코드 생성 작업 계약
   */
  generateCode(specification: CodeSpecification): Promise<CodeGenerationResult>;
  
  /**
   * 파일 변경 결과 구조
   */
  getFileChanges(): Promise<FileChangeResult[]>;
  
  /**
   * 커밋 메타데이터 결과 구조
   */
  getCommitMetadata(): Promise<CommitMetadataResult>;
  
  /**
   * 작업 결과 보고
   */
  reportResult(taskId: string, result: TaskResult): Promise<void>;
  
  /**
   * 실패/미완료 항목 기록
   */
  recordFailure(taskId: string, error: string): Promise<void>;
}

export interface CodeSpecification {
  language: string;
  framework?: string;
  requirements: string[];
  constraints: string[];
  outputPath: string;
}

export interface CodeGenerationResult {
  files: GeneratedFile[];
  success: boolean;
  errors: string[];
  warnings: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  purpose: string;
}

export interface FileChangeResult {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  linesAdded: number;
  linesRemoved: number;
  diff: string;
}

export interface CommitMetadataResult {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
  branch: string;
}
