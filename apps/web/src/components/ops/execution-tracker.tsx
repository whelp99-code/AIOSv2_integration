/**
 * Execution Tracker Component
 * AG-UI 이벤트 스트림을 통한 실시간 실행 추적
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface ExecutionEvent {
  id: string;
  type: string;
  timestamp: string;
  data: {
    executionId?: string;
    status?: string;
    tool?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

interface ExecutionSummary {
  total: number;
  running: number;
  completed: number;
  failed: number;
  recent: ExecutionEvent[];
}

interface ExecutionTrackerProps {
  onExecutionSelect?: (executionId: string) => void;
}

export function ExecutionTracker({ onExecutionSelect }: ExecutionTrackerProps) {
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [summary, setSummary] = useState<ExecutionSummary | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // SSE 연결
  useEffect(() => {
    const eventSource = new EventSource('/api/ops/events?history=true');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener('system.status', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.data?.type === 'connected' && data.data?.registry) {
          setSummary(data.data.registry);
        }
      } catch (e) {
        console.error('Failed to parse system.status:', e);
      }
    });

    // 실행 이벤트 리스닝
    const executionEventTypes = [
      'execution.start',
      'execution.progress',
      'execution.output',
      'execution.error',
      'execution.complete',
      'execution.cancel',
    ];

    for (const eventType of executionEventTypes) {
      eventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data) as ExecutionEvent;
          setEvents((prev) => {
            const newEvents = [...prev, data];
            // 최근 100개만 유지
            return newEvents.slice(-100);
          });

          // 요약 업데이트
          if (data.type === 'execution.complete' || data.type === 'execution.error') {
            fetchSummary();
          }
        } catch (e) {
          console.error(`Failed to parse ${eventType}:`, e);
        }
      });
    }

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // 요약 정보 조회
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/ops/events?history=true');
      // SSE 응답이므로 직접 파싱 불가, 대체 방법 사용
    } catch (e) {
      console.error('Failed to fetch summary:', e);
    }
  }, []);

  // 자동 스크롤
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // 실행 선택
  const handleExecutionClick = (executionId: string) => {
    setSelectedExecution(executionId);
    onExecutionSelect?.(executionId);
  };

  // 이벤트 타입별 아이콘
  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'execution.start':
        return '🚀';
      case 'execution.progress':
        return '⏳';
      case 'execution.output':
        return '📝';
      case 'execution.error':
        return '❌';
      case 'execution.complete':
        return '✅';
      case 'execution.cancel':
        return '🚫';
      default:
        return '📌';
    }
  };

  // 이벤트 타입별 색상
  const getEventColor = (type: string): string => {
    switch (type) {
      case 'execution.start':
        return '#3b82f6';
      case 'execution.progress':
        return '#f59e0b';
      case 'execution.output':
        return '#6b7280';
      case 'execution.error':
        return '#dc2626';
      case 'execution.complete':
        return '#059669';
      case 'execution.cancel':
        return '#9ca3af';
      default:
        return '#6b7280';
    }
  };

  // 상태별 배지
  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#fef3c7', text: '#d97706' },
      running: { bg: '#dbeafe', text: '#3b82f6' },
      completed: { bg: '#d1fae5', text: '#059669' },
      failed: { bg: '#fee2e2', text: '#dc2626' },
      cancelled: { bg: '#f3f4f6', text: '#6b7280' },
    };
    const c = colors[status] || colors.pending;

    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.text,
          textTransform: 'capitalize',
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 4px 0',
            }}
          >
            ⚡ Execution Tracker
          </h3>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            AG-UI Event Stream 기반 실시간 실행 추적
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connected ? '#059669' : '#dc2626',
            }}
          />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* 요약 */}
      {summary && (
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            gap: '24px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>
              {summary.total}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Total</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>
              {summary.running}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Running</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>
              {summary.completed}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Completed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
              {summary.failed}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>Failed</div>
          </div>
        </div>
      )}

      {/* 이벤트 목록 */}
      <div
        style={{
          height: '400px',
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {events.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af',
              fontSize: '14px',
            }}
          >
            실행 이벤트 대기 중...
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              onClick={() =>
                event.data.executionId && handleExecutionClick(event.data.executionId)
              }
              style={{
                padding: '10px 12px',
                marginBottom: '6px',
                borderRadius: '8px',
                backgroundColor:
                  selectedExecution === event.data.executionId ? '#eff6ff' : 'transparent',
                border:
                  selectedExecution === event.data.executionId
                    ? '1px solid #bfdbfe'
                    : '1px solid transparent',
                cursor: event.data.executionId ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '14px' }}>{getEventIcon(event.type)}</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: getEventColor(event.type),
                  }}
                >
                  {event.type.replace('execution.', '').toUpperCase()}
                </span>
                {event.data.status && <StatusBadge status={event.data.status} />}
                <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>
                  {new Date(event.timestamp).toLocaleTimeString('ko-KR')}
                </span>
              </div>
              {event.data.executionId && (
                <div style={{ fontSize: '11px', color: '#6b7280', paddingLeft: '22px' }}>
                  ID: {event.data.executionId}
                  {event.data.tool && ` • Tool: ${event.data.tool}`}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={eventsEndRef} />
      </div>

      {/* 선택된 실행 상세 */}
      {selectedExecution && (
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                margin: 0,
              }}
            >
              Selected: {selectedExecution}
            </h4>
            <button
              onClick={() => setSelectedExecution(null)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            이 실행의 상세 이벤트 내역은 위 이벤트 목록에서 확인하세요.
          </div>
        </div>
      )}
    </div>
  );
}
