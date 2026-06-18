/**
 * AG-UI Event Stream API Route
 * 실행 이벤트를 SSE로 스트리밍
 */

import { createAGUIStreamResponse } from '@aios/shared';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeHistory = url.searchParams.get('history') === 'true';
  const heartbeatMs = parseInt(url.searchParams.get('heartbeat') || '15000', 10);

  return createAGUIStreamResponse({
    includeHistory,
    heartbeatIntervalMs: heartbeatMs,
    maxEvents: 100,
  });
}
