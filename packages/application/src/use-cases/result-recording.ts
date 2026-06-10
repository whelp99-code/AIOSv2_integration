/**
 * Result Recording Use Case
 * 결과 기록 유스케이스
 */

import type { 
  Result, 
  ResultCreationRequest,
  ResultUpdateRequest,
  ResultContent,
  TaskResult
} from '@aios/domain';

export interface IResultRecordingUseCase {
  /**
   * 작업 결과 기록
   */
  recordTaskResult(taskId: string, result: TaskResult): Promise<Result>;
  
  /**
   * Phase 결과 기록
   */
  recordPhaseResult(phase: string, results: Result[]): Promise<void>;
  
  /**
   * 결과 업데이트
   */
  updateResult(resultId: string, request: ResultUpdateRequest): Promise<Result>;
  
  /**
   * 결과 조회
   */
  getResult(resultId: string): Promise<Result>;
  
  /**
   * 프로젝트 결과 목록 조회
   */
  getResultsByProject(projectId: string): Promise<Result[]>;
}

const DEFAULT_CONTENT: ResultContent = {
  summary: '',
  changes: [],
  files: [],
  commits: [],
  issues: []
};

export class ResultRecordingUseCase implements IResultRecordingUseCase {
  async recordTaskResult(taskId: string, result: TaskResult): Promise<Result> {
    const resultRecord: Result = {
      id: `result-${Date.now()}`,
      taskId,
      phase: 'unknown',
      type: result.status === 'done' ? 'success' : 'failure',
      status: 'draft',
      content: DEFAULT_CONTENT,
      createdAt: new Date(),
      metadata: {}
    };
    
    return resultRecord;
  }
  
  async recordPhaseResult(phase: string, results: Result[]): Promise<void> {
    // Phase 결과 기록 로직
    console.log(`Recording ${results.length} results for ${phase}`);
  }
  
  async updateResult(resultId: string, request: ResultUpdateRequest): Promise<Result> {
    // 결과 업데이트 로직
    const content: ResultContent = {
      summary: request.content?.summary ?? DEFAULT_CONTENT.summary,
      changes: request.content?.changes ?? DEFAULT_CONTENT.changes,
      files: request.content?.files ?? DEFAULT_CONTENT.files,
      commits: request.content?.commits ?? DEFAULT_CONTENT.commits,
      issues: request.content?.issues ?? DEFAULT_CONTENT.issues
    };
    
    return {
      id: resultId,
      taskId: '',
      phase: '',
      type: 'success',
      status: request.status || 'draft',
      content,
      createdAt: new Date(),
      metadata: {}
    };
  }
  
  async getResult(resultId: string): Promise<Result> {
    // 결과 조회 로직
    return {
      id: resultId,
      taskId: '',
      phase: '',
      type: 'success',
      status: 'draft',
      content: DEFAULT_CONTENT,
      createdAt: new Date(),
      metadata: {}
    };
  }
  
  async getResultsByProject(projectId: string): Promise<Result[]> {
    // 프로젝트 결과 목록 조회 로직
    return [];
  }
}
