/**
 * Authentication Middleware
 * 인증 미들웨어 (AIOS v1 재활용)
 */

import type { Request, Response, NextFunction } from 'express';

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
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;

  if (userId) {
    req.user = {
      id: userId,
      email: userEmail || 'unknown',
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
