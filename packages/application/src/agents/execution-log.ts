/**
 * Agent Execution Log Model
 * 에이전트 실행 로그 모델
 */

export interface AgentExecutionLog {
  id: string;
  agentType: 'hermes' | 'opencode' | 'manual';
  taskId: string;
  jobId: string;
  action: LogAction;
  timestamp: Date;
  duration?: number;
  details: LogDetails;
  metadata: Record<string, unknown>;
}

export type LogAction = 
  | 'started'
  | 'completed'
  | 'failed'
  | 'deferred'
  | 'blocked'
  | 'resumed'
  | 'cancelled';

export interface LogDetails {
  message: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  artifacts?: string[];
}

export interface ExecutionSummary {
  agentType: 'hermes' | 'opencode' | 'manual';
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  deferredExecutions: number;
  averageDuration: number;
  lastExecution: Date;
}

export interface ExecutionFilter {
  agentType?: 'hermes' | 'opencode' | 'manual';
  taskId?: string;
  action?: LogAction;
  startDate?: Date;
  endDate?: Date;
}

// Execution log creation helper
export function createExecutionLog(
  agentType: 'hermes' | 'opencode' | 'manual',
  taskId: string,
  jobId: string,
  action: LogAction,
  details: LogDetails
): AgentExecutionLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentType,
    taskId,
    jobId,
    action,
    timestamp: new Date(),
    details,
    metadata: {}
  };
}

// Execution summary calculator
export function calculateExecutionSummary(logs: AgentExecutionLog[]): ExecutionSummary {
  const successful = logs.filter(l => l.action === 'completed').length;
  const failed = logs.filter(l => l.action === 'failed').length;
  const deferred = logs.filter(l => l.action === 'deferred').length;
  
  const durations = logs.filter(l => l.duration).map(l => l.duration!);
  const averageDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;
  
  return {
    agentType: logs[0]?.agentType || 'hermes',
    totalExecutions: logs.length,
    successfulExecutions: successful,
    failedExecutions: failed,
    deferredExecutions: deferred,
    averageDuration,
    lastExecution: logs[0]?.timestamp || new Date()
  };
}
