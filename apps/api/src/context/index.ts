/**
 * tRPC Context
 * 요청 컨텍스트 생성
 */

import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Context } from "../context";

export function createContext({ req }: CreateExpressContextOptions): Context {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    return {
      userId: "authenticated-user",
      userRole: "user",
      sessionId: token.slice(0, 8),
    };
  }

  const cookie = req.headers.cookie || "";
  const sessionToken = cookie
    .split(";")
    .find((c) => c.trim().startsWith("next-auth.session-token="))
    ?.split("=")[1];

  if (sessionToken) {
    return {
      userId: "session-user",
      userRole: "user",
      sessionId: sessionToken.slice(0, 8),
    };
  }

  return {
    userId: null,
    userRole: null,
    sessionId: null,
  };
}
