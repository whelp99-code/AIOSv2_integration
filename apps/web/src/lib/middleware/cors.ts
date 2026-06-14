/**
 * CORS Configuration
 * 환경변수 기반 CORS 정책
 */

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3100')
  .split(',')
  .map(o => o.trim());

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {};

  // Origin 검증
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (ALLOWED_ORIGINS.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  // else: CORS 헤더 없음 → 브라우저가 차단

  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Request-Id';
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Max-Age'] = '86400';

  return headers;
}

/** OPTIONS preflight 응답 */
export function handleCorsPreFlight(origin?: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
