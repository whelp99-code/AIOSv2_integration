/**
 * AG-UI Event Stream
 * Agent-UI Protocol 이벤트 스트림 구현
 * 실행 상태를 실시간으로 클라이언트에 전달
 */

import { ExecutionRegistry, type ExecutionEvent, type ExecutionRecord } from './execution-registry';

export interface AGUIEvent {
  id: string;
  type: 'execution.start' | 'execution.progress' | 'execution.output' | 'execution.error' | 'execution.complete' | 'execution.cancel' | 'system.health' | 'system.status';
  timestamp: string;
  data: Record<string, unknown>;
}

export interface AGUIStreamConfig {
  heartbeatIntervalMs?: number;
  maxEvents?: number;
  includeHistory?: boolean;
}

const DEFAULT_CONFIG: AGUIStreamConfig = {
  heartbeatIntervalMs: 15000,
  maxEvents: 100,
  includeHistory: false,
};

/**
 * AG-UI Event Stream 생성
 * SSE(Server-Sent Events) 형태로 실행 이벤트를 스트리밍
 */
export function createAGUIStream(config: AGUIStreamConfig = {}): ReadableStream {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const registry = ExecutionRegistry.getInstance();
  const eventQueue: AGUIEvent[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  // 이벤트를 SSE 형식으로 인코딩
  function encodeEvent(event: AGUIEvent): Uint8Array {
    const data = JSON.stringify(event);
    return new TextEncoder().encode(`id: ${event.id}\nevent: ${event.type}\ndata: ${data}\n\n`);
  }

  // 이벤트 전송
  function sendEvent(event: AGUIEvent): void {
    if (isClosed) return;
    try {
      controller.enqueue(encodeEvent(event));
    } catch (e) {
      console.error('Failed to send AG-UI event:', e);
    }
  }

  // 하트비트 전송
  function sendHeartbeat(): void {
    if (isClosed) return;
    const heartbeat: AGUIEvent = {
      id: `heartbeat-${Date.now()}`,
      type: 'system.status',
      timestamp: new Date().toISOString(),
      data: { type: 'heartbeat', registry: registry.getSummary() },
    };
    sendEvent(heartbeat);
  }

  // 실행 이벤트를 AG-UI 이벤트로 변환
  function mapExecutionEvent(event: ExecutionEvent): AGUIEvent {
    return {
      id: event.id,
      type: `execution.${event.type}` as AGUIEvent['type'],
      timestamp: event.timestamp,
      data: {
        executionId: event.executionId,
        ...event.data,
      },
    };
  }

  // 레지스트리 이벤트 리스너 등록
  const unsubscribe = registry.onAny((event: ExecutionEvent) => {
    const aguiEvent = mapExecutionEvent(event);
    eventQueue.push(aguiEvent);

    // 큐 크기 제한
    if (eventQueue.length > (mergedConfig.maxEvents ?? 100)) {
      eventQueue.shift();
    }

    sendEvent(aguiEvent);
  });

  // 스트림 생성
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // 초기 연결 이벤트
      const connectEvent: AGUIEvent = {
        id: `connect-${Date.now()}`,
        type: 'system.status',
        timestamp: new Date().toISOString(),
        data: {
          type: 'connected',
          registry: registry.getSummary(),
          config: mergedConfig,
        },
      };
      sendEvent(connectEvent);

      // 히스토리 포함 옵션
      if (mergedConfig.includeHistory) {
        const recentExecutions = registry.getSummary().recent;
        for (const exec of recentExecutions) {
          const historyEvent: AGUIEvent = {
            id: `history-${exec.id}`,
            type: 'execution.progress',
            timestamp: exec.startedAt,
            data: {
              executionId: exec.id,
              status: exec.status,
              tool: exec.tool,
              sessionId: exec.sessionId,
              metadata: exec.metadata,
              isHistory: true,
            },
          };
          sendEvent(historyEvent);
        }
      }

      // 하트비트 시작
      heartbeatTimer = setInterval(sendHeartbeat, mergedConfig.heartbeatIntervalMs ?? 15000);
    },

    cancel() {
      isClosed = true;
      unsubscribe();
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  return stream;
}

/**
 * AG-UI Event Stream HTTP 응답 생성
 */
export function createAGUIStreamResponse(config?: AGUIStreamConfig): Response {
  const stream = createAGUIStream(config);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * AG-UI 이벤트 타입 가드
 */
export function isExecutionEvent(event: AGUIEvent): boolean {
  return event.type.startsWith('execution.');
}

/**
 * AG-UI 이벤트 필터링
 */
export function filterEvents(
  events: AGUIEvent[],
  predicate: (event: AGUIEvent) => boolean
): AGUIEvent[] {
  return events.filter(predicate);
}

/**
 * 실행 상태별 이벤트 필터
 */
export function filterByStatus(
  events: AGUIEvent[],
  status: ExecutionRecord['status']
): AGUIEvent[] {
  return events.filter(
    (event) => isExecutionEvent(event) && event.data.status === status
  );
}
