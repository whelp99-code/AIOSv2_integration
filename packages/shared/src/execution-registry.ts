/**
 * Execution ID Shared Registry
 * 웹과 데스크톱 간 실행 ID 공유를 위한 레지스트리
 */

export interface ExecutionRecord {
  id: string;
  sessionId: string;
  assignmentId?: string;
  tool: 'cursor' | 'opencode' | 'hermes' | 'claude';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  metadata: {
    command?: string;
    exitCode?: number;
    summary?: string;
    error?: string;
    pid?: number;
    port?: number;
  };
  events: ExecutionEvent[];
}

export interface ExecutionEvent {
  id: string;
  executionId: string;
  type: 'start' | 'progress' | 'output' | 'error' | 'complete' | 'cancel';
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ExecutionSummary {
  total: number;
  running: number;
  completed: number;
  failed: number;
  recent: ExecutionRecord[];
}

type ExecutionEventType = ExecutionEvent['type'];
type ExecutionEventListener = (event: ExecutionEvent) => void;

/**
 * Execution ID 생성 (UUID v4 간이 구현)
 */
export function generateExecutionId(): string {
  return 'exec-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Execution Event ID 생성
 */
export function generateEventId(): string {
  return 'evt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/**
 * Execution Registry 클래스
 * 싱글톤 패턴으로 웹/데스크톱 간 상태 공유
 */
export class ExecutionRegistry {
  private static instance: ExecutionRegistry | null = null;
  private executions: Map<string, ExecutionRecord> = new Map();
  private listeners: Map<ExecutionEventType, Set<ExecutionEventListener>> = new Map();
  private globalListeners: Set<ExecutionEventListener> = new Set();

  private constructor() {}

  static getInstance(): ExecutionRegistry {
    if (!ExecutionRegistry.instance) {
      ExecutionRegistry.instance = new ExecutionRegistry();
    }
    return ExecutionRegistry.instance;
  }

  /**
   * 새 실행 등록
   */
  register(params: {
    sessionId: string;
    assignmentId?: string;
    tool: ExecutionRecord['tool'];
    metadata?: Partial<ExecutionRecord['metadata']>;
  }): ExecutionRecord {
    const id = generateExecutionId();
    const now = new Date().toISOString();

    const record: ExecutionRecord = {
      id,
      sessionId: params.sessionId,
      assignmentId: params.assignmentId,
      tool: params.tool,
      status: 'pending',
      startedAt: now,
      metadata: params.metadata ?? {},
      events: [],
    };

    this.executions.set(id, record);
    this.emitEvent({
      id: generateEventId(),
      executionId: id,
      type: 'start',
      timestamp: now,
      data: { tool: params.tool, sessionId: params.sessionId },
    });

    return record;
  }

  /**
   * 실행 상태 업데이트
   */
  update(
    executionId: string,
    updates: Partial<Pick<ExecutionRecord, 'status' | 'metadata' | 'completedAt'>>
  ): ExecutionRecord | null {
    const record = this.executions.get(executionId);
    if (!record) return null;

    if (updates.status) record.status = updates.status;
    if (updates.metadata) record.metadata = { ...record.metadata, ...updates.metadata };
    if (updates.completedAt) record.completedAt = updates.completedAt;

    const eventType: ExecutionEventType =
      updates.status === 'completed' ? 'complete' :
      updates.status === 'failed' ? 'error' :
      updates.status === 'cancelled' ? 'cancel' :
      'progress';

    this.emitEvent({
      id: generateEventId(),
      executionId,
      type: eventType,
      timestamp: new Date().toISOString(),
      data: { ...updates },
    });

    return record;
  }

  /**
   * 실행 기록 조회
   */
  get(executionId: string): ExecutionRecord | null {
    return this.executions.get(executionId) ?? null;
  }

  /**
   * 세션별 실행 목록 조회
   */
  getBySession(sessionId: string): ExecutionRecord[] {
    return Array.from(this.executions.values()).filter(
      (exec) => exec.sessionId === sessionId
    );
  }

  /**
   * 상태별 실행 목록 조회
   */
  getByStatus(status: ExecutionRecord['status']): ExecutionRecord[] {
    return Array.from(this.executions.values()).filter(
      (exec) => exec.status === status
    );
  }

  /**
   * 실행 요약 정보
   */
  getSummary(): ExecutionSummary {
    const all = Array.from(this.executions.values());
    return {
      total: all.length,
      running: all.filter((e) => e.status === 'running').length,
      completed: all.filter((e) => e.status === 'completed').length,
      failed: all.filter((e) => e.status === 'failed').length,
      recent: all
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, 10),
    };
  }

  /**
   * 이벤트 리스너 등록
   */
  on(type: ExecutionEventType, listener: ExecutionEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /**
   * 모든 이벤트 리스너 등록
   */
  onAny(listener: ExecutionEventListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  /**
   * 이벤트 발생
   */
  private emitEvent(event: ExecutionEvent): void {
    // 타입별 리스너
    this.listeners.get(event.type)?.forEach((listener) => {
      try { listener(event); } catch (e) { console.error('Execution event listener error:', e); }
    });

    // 글로벌 리스너
    this.globalListeners.forEach((listener) => {
      try { listener(event); } catch (e) { console.error('Execution global listener error:', e); }
    });

    // 레코드에 이벤트 추가
    const record = this.executions.get(event.executionId);
    if (record) {
      record.events.push(event);
    }
  }

  /**
   * 실행 취소
   */
  cancel(executionId: string): ExecutionRecord | null {
    return this.update(executionId, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * 완료 처리
   */
  complete(
    executionId: string,
    result: { exitCode?: number; summary?: string; error?: string }
  ): ExecutionRecord | null {
    return this.update(executionId, {
      status: result.error ? 'failed' : 'completed',
      completedAt: new Date().toISOString(),
      metadata: {
        exitCode: result.exitCode,
        summary: result.summary,
        error: result.error,
      },
    });
  }

  /**
   * 레지스트리 초기화 (테스트용)
   */
  clear(): void {
    this.executions.clear();
    this.listeners.clear();
    this.globalListeners.clear();
  }

  /**
   * 실행 기록을 JSON으로 직렬화
   */
  serialize(): string {
    return JSON.stringify(Array.from(this.executions.values()), null, 2);
  }

  /**
   * JSON에서 실행 기록 복원
   */
  deserialize(data: string): void {
    try {
      const records: ExecutionRecord[] = JSON.parse(data);
      this.executions.clear();
      for (const record of records) {
        this.executions.set(record.id, record);
      }
    } catch (e) {
      console.error('Failed to deserialize execution records:', e);
    }
  }
}

// 싱글톤 인스턴스 export
export const executionRegistry = ExecutionRegistry.getInstance();
