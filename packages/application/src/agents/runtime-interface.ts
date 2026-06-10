/**
 * Agent Runtime Interface
 * 에이전트 실행 인터페이스
 */

import type { 
  AgentJob, 
  AgentJobCreationRequest,
  AgentJobUpdateRequest,
  JobInput,
  JobOutput,
  AgentType
} from '@aios/domain';

export interface IAgentRuntime {
  /**
   * 에이전트 타입
   */
  readonly agentType: AgentType;
  
  /**
   * 에이전트 작업 실행
   */
  executeJob(request: AgentJobCreationRequest): Promise<AgentJob>;
  
  /**
   * 작업 상태 업데이트
   */
  updateJobStatus(jobId: string, request: AgentJobUpdateRequest): Promise<AgentJob>;
  
  /**
   * 작업 결과 수집
   */
  collectResult(jobId: string): Promise<JobOutput>;
  
  /**
   * 에이전트 상태 확인
   */
  getStatus(): Promise<AgentStatus>;
  
  /**
   * 에이전트 초기화
   */
  initialize(): Promise<void>;
  
  /**
   * 에이전트 종료
   */
  shutdown(): Promise<void>;
}

export interface AgentStatus {
  agentType: AgentType;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentJob?: string;
  uptime: number;
  lastActivity: Date;
}

export interface AgentCapabilities {
  canCreateFiles: boolean;
  canModifyFiles: boolean;
  canDeleteFiles: boolean;
  canExecuteCommands: boolean;
  canCreateCommits: boolean;
  canCreatePRs: boolean;
  canAccessNetwork: boolean;
  canAccessDatabase: boolean;
}
