/**
 * tRPC Context
 * 요청 컨텍스트 생성
 */

import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export interface Context {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
}

export function createContext({ req }: CreateExpressContextOptions): Context {
  return {
    userId: req.headers['x-user-id'] as string | undefined,
    sessionId: req.headers['x-session-id'] as string | undefined,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };
}
