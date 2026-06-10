/**
 * Core Workflow Service
 * 핵심 워크플로우 서비스 계약
 */

import type { 
  Project, 
  ProjectIntakeRequest, 
  ProjectIntakeResult,
  Task,
  TaskCreationRequest,
  TaskResult,
  WorkflowState,
  WorkflowPhase,
  WorkflowProgress
} from '@aios/domain';

export interface ICoreWorkflowService {
  /**
   * 프로젝트 수신 및 초기화
   */
  intakeProject(request: ProjectIntakeRequest): Promise<ProjectIntakeResult>;
  
  /**
   * 작업 생성
   */
  createTask(request: TaskCreationRequest): Promise<Task>;
  
  /**
   * 작업 결과 기록
   */
  recordTaskResult(taskId: string, result: TaskResult): Promise<void>;
  
  /**
   * Phase 진행
   */
  advancePhase(projectId: string, targetPhase: WorkflowPhase): Promise<WorkflowState>;
  
  /**
   * 워크플로우 상태 조회
   */
  getWorkflowState(projectId: string): Promise<WorkflowState>;
  
  /**
   * 워크플로우 진행률 조회
   */
  getWorkflowProgress(projectId: string): Promise<WorkflowProgress>;
  
  /**
   * 프로젝트 조회
   */
  getProject(projectId: string): Promise<Project>;
  
  /**
   * 작업 목록 조회
   */
  getTasksByProject(projectId: string): Promise<Task[]>;
}
