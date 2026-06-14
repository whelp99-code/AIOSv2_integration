/**
 * Rate Limiting Middleware
 * API 호출 제한 (sliding window)
 */

import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000; // 1분마다 정리

// 메모리 누수 방지 — 오래된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL).unref();

export interface RateLimitConfig {
  windowMs: number;   // 시간 윈도우 (ms)
  maxRequests: number; // 최대 요청 수
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,    // 1분
  maxRequests: 100,    // 100회/분
};

const STRICT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 10,     // 10회/분 (민감 API)
};

/**
 * Rate limit 체크
 * @returns { limited: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG,
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const key = `rl:${identifier}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // 새 윈도우 시작
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { limited: false, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Next.js API Route용 Rate Limit 헤더 설정
 */
export function setRateLimitHeaders(
  headers: Headers,
  result: { remaining: number; resetAt: number },
): void {
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
}

/** 클라이언트 IP 추출 */
export function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export { STRICT_CONFIG };
