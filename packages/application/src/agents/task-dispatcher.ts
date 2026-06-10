/**
 * Agent Task Dispatcher
 * 에이전트 작업 분배기
 */

import type { 
  Task, 
  AgentType,
  AgentJob,
  AgentJobCreationRequest
} from '@aios/domain';

export interface IAgentTaskDispatcher {
  /**
   * 작업을 적절한 에이전트에 분배
   */
  dispatchTask(task: Task): Promise<AgentJob>;
  
  /**
   * 에이전트 유형 결정
   */
  determineAgentType(task: Task): AgentType;
  
  /**
   * 작업 우선순위 계산
   */
  calculatePriority(task: Task): number;
  
  /**
   * 작업 의존성 확인
   */
  checkDependencies(task: Task): Promise<boolean>;
  
  /**
   * 에이전트 가용성 확인
   */
  checkAgentAvailability(agentType: AgentType): Promise<boolean>;
}

export class AgentTaskDispatcher implements IAgentTaskDispatcher {
  async dispatchTask(task: Task): Promise<AgentJob> {
    const agentType = this.determineAgentType(task);
    
    const request: AgentJobCreationRequest = {
      taskId: task.id,
      agentType,
      input: {
        task: task.title,
        context: task.metadata,
        constraints: []
      }
    };
    
    // 실제 구현에서는 에이전트 런타임을 통해 작업 실행
    return {
      id: `job-${Date.now()}`,
      taskId: task.id,
      agentType,
      status: 'pending',
      startedAt: new Date(),
      input: request.input,
      metadata: {}
    };
  }
  
  determineAgentType(task: Task): AgentType {
    // 작업 유형에 따라 에이전트 결정
    if (task.assignee) {
      return task.assignee;
    }
    
    // 기본값: opencode
    return 'opencode';
  }
  
  calculatePriority(task: Task): number {
    const priorityMap = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    return priorityMap[task.priority] || 0;
  }
  
  async checkDependencies(task: Task): Promise<boolean> {
    // 의존성 확인 로직
    return true;
  }
  
  async checkAgentAvailability(agentType: AgentType): Promise<boolean> {
    // 에이전트 가용성 확인 로직
    return true;
  }
}
