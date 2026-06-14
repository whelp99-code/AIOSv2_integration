/**
 * Standardized Error Response
 * 프로덕션에서 stack/internal 정보 노출 방지
 */

export interface ApiErrorResponse {
  error: string;
  message: string;
  requestId?: string;
  // 프로덕션에서 절대 포함하지 않는 필드
  // stack?: string
  // cause?: unknown
  // internalCode?: string
}

/** Dev-only fields appended to error payloads outside production. */
type DevApiErrorResponse = ApiErrorResponse & { devStack?: string };

/**
 * 안전한 에러 응답 생성
 * - 프로덕션: message만 반환
 * - 개발: message + limited stack
 */
export function createErrorResponse(
  error: unknown,
  statusCode: number = 500,
  requestId?: string,
): Response {
  const isProd = process.env.NODE_ENV === "production";
  const message =
    error instanceof Error ? error.message : "Internal server error";

  const body: DevApiErrorResponse = {
    error: statusCode >= 500 ? "Internal Server Error" : "Bad Request",
    message: isProd
      ? statusCode >= 500
        ? "An unexpected error occurred"
        : message
      : message,
  };

  if (requestId) {
    body.requestId = requestId;
  }

  // 개발 환경에서만 stack 포함 (프로덕션 절대 금지)
  if (!isProd && error instanceof Error && error.stack) {
    body.devStack = error.stack.split("\n").slice(0, 5).join("\n");
  }

  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
