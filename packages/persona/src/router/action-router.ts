/**
 * ActionRouter - 페르소나 간 동시/순차 실행 로직
 * 
 * Redis Stream 기반 비동기 실행, 우선순위 큐, 지수 백오프 재시도, DLQ 처리
 */

import Redis from 'ioredis';
import { type PersonaType } from '../mail/classifier';

// 우선순위 정의
const PERSONA_PRIORITY: Record<PersonaType, number> = {
  'CEO': 100,
  'FINANCE': 80,
  'SALES': 70,
  'PRESALES': 60,
  'PM': 50,
  'ENGINEER': 40,
  'MARKETING': 30,
  'WORK_SUPPORT': 20,
};

// 실행 상태
export type ActionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DLQ';

// 실행 아이템
export interface ActionItem {
  id: string;
  personaType: PersonaType;
  mailId: string;
  priority: number;
  status: ActionStatus;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

// 실행 결과
export interface ActionResult {
  actionId: string;
  personaType: PersonaType;
  status: ActionStatus;
  result: unknown;
  duration: number;
  timestamp: string;
}

// 라우터 설정
export interface ActionRouterConfig {
  redisUrl?: string;
  streamName?: string;
  consumerGroup?: string;
  consumerName?: string;
  maxRetries?: number;
  retryIntervals?: number[]; // 밀리초 단위
}

/**
 * ActionRouter - 비동기 실행 라우터
 */
export class ActionRouter {
  private redis: Redis;
  private streamName: string;
  private consumerGroup: string;
  private consumerName: string;
  private maxRetries: number;
  private retryIntervals: number[];
  private actionQueue: ActionItem[] = [];
  private runningActions: Map<string, ActionItem> = new Map();
  private dlq: ActionItem[] = [];

  constructor(config: ActionRouterConfig = {}) {
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6382');
    this.streamName = config.streamName || 'aios:action-router';
    this.consumerGroup = config.consumerGroup || 'action-workers';
    this.consumerName = config.consumerName || `worker-${process.pid}`;
    this.maxRetries = config.maxRetries || 5;
    this.retryIntervals = config.retryIntervals || [60000, 300000, 1800000]; // 1분, 5분, 30분
  }

  /**
   * Consumer Group 초기화
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', this.streamName, this.consumerGroup, '0', 'MKSTREAM');
    } catch (error: any) {
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * 액션 제출 (우선순위 큐에 추가)
   */
  async submitAction(personaType: PersonaType, mailId: string): Promise<string> {
    const action: ActionItem = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      personaType,
      mailId,
      priority: PERSONA_PRIORITY[personaType] || 0,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: this.maxRetries,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 우선순위 큐에 삽입 (높은 우선순위가 앞에 오도록)
    const insertIndex = this.actionQueue.findIndex(a => a.priority < action.priority);
    if (insertIndex === -1) {
      this.actionQueue.push(action);
    } else {
      this.actionQueue.splice(insertIndex, 0, action);
    }

    // Redis Stream에 이벤트 발행
    await this.redis.xadd(
      this.streamName,
      '*',
      'actionId', action.id,
      'personaType', personaType,
      'mailId', mailId,
      'priority', action.priority.toString(),
    );

    console.log(`[ActionRouter] Action submitted: ${action.id} (${personaType}, priority: ${action.priority})`);
    return action.id;
  }

  /**
   * 다음 실행할 액션 가져오기
   */
  async dequeueAction(): Promise<ActionItem | null> {
    // 큐에서 가장 높은 우선순위 액션 가져오기
    const action = this.actionQueue.shift();
    if (!action) return null;

    action.status = 'RUNNING';
    action.updatedAt = new Date().toISOString();
    this.runningActions.set(action.id, action);

    return action;
  }

  /**
   * 액션 완료 처리
   */
  async completeAction(actionId: string, result: unknown): Promise<ActionResult> {
    const action = this.runningActions.get(actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.status = 'COMPLETED';
    action.updatedAt = new Date().toISOString();
    this.runningActions.delete(actionId);

    console.log(`[ActionRouter] Action completed: ${actionId}`);

    return {
      actionId,
      personaType: action.personaType,
      status: 'COMPLETED',
      result,
      duration: Date.now() - new Date(action.createdAt).getTime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 액션 실패 처리 (재시도 또는 DLQ)
   */
  async failAction(actionId: string, error: string): Promise<void> {
    const action = this.runningActions.get(actionId);
    if (!action) {
      throw new Error(`Action not found: ${actionId}`);
    }

    action.retryCount++;
    action.lastError = error;
    action.updatedAt = new Date().toISOString();
    this.runningActions.delete(actionId);

    if (action.retryCount >= action.maxRetries) {
      // DLQ로 이동
      action.status = 'DLQ';
      this.dlq.push(action);
      console.log(`[ActionRouter] Action moved to DLQ: ${actionId} (max retries exceeded)`);
    } else {
      // 재시도 큐에 추가 (지수 백오프)
      action.status = 'RETRYING';
      const retryDelay = this.retryIntervals[Math.min(action.retryCount - 1, this.retryIntervals.length - 1)];
      console.log(`[ActionRouter] Action scheduled for retry: ${actionId} (attempt ${action.retryCount}, delay: ${retryDelay}ms)`);

      // 지연 후 큐에 다시 추가
      setTimeout(() => {
        action.status = 'PENDING';
        const insertIndex = this.actionQueue.findIndex(a => a.priority < action.priority);
        if (insertIndex === -1) {
          this.actionQueue.push(action);
        } else {
          this.actionQueue.splice(insertIndex, 0, action);
        }
      }, retryDelay);
    }
  }

  /**
   * 뮤텍스: 같은 리소스 접근 직렬화
   */
  async acquireLock(resourceId: string, ttl: number = 30000): Promise<boolean> {
    const lockKey = `lock:${resourceId}`;
    const result = await this.redis.set(lockKey, this.consumerName, 'PX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 뮤텍스 해제
   */
  async releaseLock(resourceId: string): Promise<void> {
    const lockKey = `lock:${resourceId}`;
    await this.redis.del(lockKey);
  }

  /**
   * 큐 상태 조회
   */
  getQueueStatus(): {
    pending: number;
    running: number;
    dlq: number;
    queue: ActionItem[];
  } {
    return {
      pending: this.actionQueue.filter(a => a.status === 'PENDING').length,
      running: this.runningActions.size,
      dlq: this.dlq.length,
      queue: [...this.actionQueue],
    };
  }

  /**
   * DLQ 조회
   */
  getDLQ(): ActionItem[] {
    return [...this.dlq];
  }

  /**
   * DLQ에서 액션 재시도
   */
  async retryFromDLQ(actionId: string): Promise<void> {
    const index = this.actionQueue.findIndex(a => a.id === actionId);
    if (index === -1) {
      throw new Error(`Action not found in DLQ: ${actionId}`);
    }

    const action = this.actionQueue[index];
    action.status = 'PENDING';
    action.retryCount = 0;
    action.lastError = null;
    action.updatedAt = new Date().toISOString();

    // DLQ에서 제거하고 큐에 다시 추가
    this.dlq.splice(index, 1);
    const insertIndex = this.actionQueue.findIndex(a => a.priority < action.priority);
    if (insertIndex === -1) {
      this.actionQueue.push(action);
    } else {
      this.actionQueue.splice(insertIndex, 0, action);
    }

    console.log(`[ActionRouter] Action retried from DLQ: ${actionId}`);
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
