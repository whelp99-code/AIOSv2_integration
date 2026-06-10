/**
 * Agent Job Domain Model
 * 에이전트 작업 관리를 위한 도메인 모델
 */

export interface AgentJob {
  id: string;
  taskId: string;
  agentType: AgentType;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  input: JobInput;
  output?: JobOutput;
  error?: string;
  metadata: Record<string, unknown>;
}

export type AgentType = 'hermes' | 'opencode' | 'manual';

export type JobStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobInput {
  task: string;
  context: Record<string, unknown>;
  constraints: string[];
}

export interface JobOutput {
  result: unknown;
  artifacts: Artifact[];
  duration: number;
}

export interface Artifact {
  type: 'file' | 'commit' | 'pr' | 'comment';
  path?: string;
  content?: string;
  metadata: Record<string, unknown>;
}

export interface AgentJobCreationRequest {
  taskId: string;
  agentType: AgentType;
  input: JobInput;
}

export interface AgentJobUpdateRequest {
  status?: JobStatus;
  output?: JobOutput;
  error?: string;
}
