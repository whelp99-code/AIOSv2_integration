/**
 * Agent Result Collector
 * 에이전트 결과 수집기
 */

import type { 
  AgentJob, 
  JobOutput,
  TaskResult,
  Result,
  ResultCreationRequest
} from '@aios/domain';

export interface IAgentResultCollector {
  /**
   * 에이전트 작업 결과 수집
   */
  collectJobResult(job: AgentJob): Promise<JobOutput>;
  
  /**
   * 작업 결과로 변환
   */
  convertToTaskResult(job: AgentJob, output: JobOutput): TaskResult;
  
  /**
   * 결과 기록 생성
   */
  createResultRecord(taskResult: TaskResult): Promise<Result>;
  
  /**
   * 결과 검증
   */
  validateResult(result: TaskResult): Promise<ValidationResult>;
  
  /**
   * 결과 집계
   */
  aggregateResults(results: TaskResult[]): Promise<AggregatedResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AggregatedResult {
  total: number;
  successful: number;
  failed: number;
  deferred: number;
  summary: string;
}

export class AgentResultCollector implements IAgentResultCollector {
  async collectJobResult(job: AgentJob): Promise<JobOutput> {
    // 에이전트 작업 결과 수집 로직
    return job.output || {
      result: null,
      artifacts: [],
      duration: 0
    };
  }
  
  convertToTaskResult(job: AgentJob, output: JobOutput): TaskResult {
    return {
      taskId: job.taskId,
      status: job.status === 'completed' ? 'done' : 'blocked',
      output: output.result,
      completedAt: job.completedAt || new Date(),
      duration: output.duration
    };
  }
  
  async createResultRecord(taskResult: TaskResult): Promise<Result> {
    const request: ResultCreationRequest = {
      taskId: taskResult.taskId,
      phase: 'unknown',
      type: taskResult.status === 'done' ? 'success' : 'failure',
      content: {
        summary: String(taskResult.output || ''),
        changes: [],
        files: [],
        commits: [],
        issues: []
      }
    };
    
    return {
      id: `result-${Date.now()}`,
      taskId: request.taskId,
      phase: request.phase,
      type: request.type,
      status: 'draft',
      content: request.content,
      createdAt: new Date(),
      metadata: {}
    };
  }
  
  async validateResult(result: TaskResult): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!result.taskId) {
      errors.push('Task ID is required');
    }
    
    if (!result.status) {
      errors.push('Status is required');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  async aggregateResults(results: TaskResult[]): Promise<AggregatedResult> {
    const successful = results.filter(r => r.status === 'done').length;
    const failed = results.filter(r => r.status === 'blocked').length;
    const deferred = results.filter(r => r.status === 'deferred').length;
    
    return {
      total: results.length,
      successful,
      failed,
      deferred,
      summary: `${successful}/${results.length} tasks completed successfully`
    };
  }
}
