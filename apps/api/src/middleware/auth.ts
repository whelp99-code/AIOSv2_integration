/**
 * Authentication Middleware
 * 인증 미들웨어 (AIOS v1 재활용)
 */

import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const serviceKey = req.headers['x-api-key'];
  const expectedServiceKey = process.env.AIOS_SERVICE_API_KEY;

  if (
    typeof serviceKey === 'string' &&
    expectedServiceKey &&
    safeEqual(serviceKey, expectedServiceKey)
  ) {
    req.user = {
      id: 'service:f-aios-v3',
      email: 'f-aios-v3@services.aios.local',
      role: 'SERVICE',
    };
    next();
    return;
  }

  const userId = req.headers['x-user-id'];
  const userEmail = req.headers['x-user-email'];

  if (typeof userId === 'string' && process.env.NODE_ENV !== 'production') {
    req.user = {
      id: userId,
      email: typeof userEmail === 'string' ? userEmail : 'unknown',
      role: 'USER',
    };
    next();
  } else {
    // 개발 환경에서는 기본 사용자 허용
    if (process.env.NODE_ENV === 'development') {
      req.user = { id: 'dev-user', email: 'dev@aios.local', name: 'Developer', role: 'ADMIN' };
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  }
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
