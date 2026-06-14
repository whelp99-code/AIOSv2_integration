/**
 * tRPC Context
 * 요청별 컨텍스트 생성 (인증 포함)
 */

import type { CreateNextContextOptions } from '@trpc/server/adapters/next';

export interface Context {
  userId: string | null;
  userRole: string | null;
  sessionId: string | null;
}

/**
 * tRPC 컨텍스트 생성
 * - Authorization 헤더에서 Bearer 토큰 추출
 * - 쿠키에서 세션 확인
 * - X-User-Id 헤더는 절대 신뢰하지 않음 (보안)
 */
export async function createTRPCContext(opts: CreateNextContextOptions): Promise<Context> {
  const { req } = opts;

  // 1. Authorization 헤더에서 토큰 확인
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // TODO: JWT 검증 구현 (현재는 토큰 존재 여부만 확인)
    // 실제 구현: verifyJWT(token, process.env.NEXTAUTH_SECRET)
    return {
      userId: 'authenticated-user',
      userRole: 'user',
      sessionId: token.slice(0, 8),
    };
  }

  // 2. 쿠키에서 세션 확인 (NextAuth)
  const cookie = req.headers.cookie || '';
  const sessionToken = cookie
    .split(';')
    .find(c => c.trim().startsWith('next-auth.session-token='))
    ?.split('=')[1];

  if (sessionToken) {
    return {
      userId: 'session-user',
      userRole: 'user',
      sessionId: sessionToken.slice(0, 8),
    };
  }

  // 3. 인증 없음
  return {
    userId: null,
    userRole: null,
    sessionId: null,
  };
}
