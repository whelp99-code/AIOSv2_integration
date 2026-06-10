/**
 * Hermes Role Contract
 * Hermes 에이전트 역할 계약
 */

import type { 
  Task, 
  TaskCreationRequest,
  WorkflowPhase,
  WorkflowProgress,
  DeferredItem,
  ApprovalRequest
} from '@aios/domain';

export interface IHermesRole {
  /**
   * Phase 작업 계획 수립
   */
  planPhaseTasks(phase: WorkflowPhase): Promise<Task[]>;
  
  /**
   * 작업 분배
   */
  dispatchTask(task: Task): Promise<void>;
  
  /**
   * Kanban 상태 업데이트 요청
   */
  requestKanbanUpdate(taskId: string, status: string): Promise<void>;
  
  /**
   * 결과 수집 및 집계
   */
  aggregateResults(phase: WorkflowPhase): Promise<AggregatedResult>;
  
  /**
   * Deferred 항목 추적
   */
  trackDeferredItems(items: DeferredItem[]): Promise<void>;
  
  /**
   * 최종 보고서 생성 트리거
   */
  triggerFinalReport(phase: WorkflowPhase): Promise<void>;
  
  /**
   * 승인 요청 처리
   */
  handleApprovalRequest(request: ApprovalRequest): Promise<ApprovalDecision>;
  
  /**
   * Phase 완료 여부 판단
   */
  judgePhaseCompletion(phase: WorkflowPhase): Promise<boolean>;
}

export interface AggregatedResult {
  phase: WorkflowPhase;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  deferredTasks: number;
  summary: string;
  artifacts: string[];
}

export interface ApprovalDecision {
  approved: boolean;
  reason: string;
  conditions?: string[];
}

export interface HermesTaskDispatchResult {
  taskId: string;
  assignee: 'opencode' | 'manual';
  dispatchedAt: Date;
  estimatedDuration?: string;
}
