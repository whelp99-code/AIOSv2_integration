/**
 * AIOS v1 Proxy Route Handler
 * Shared handler for all 19 AIOS v1 mail API routes
 * Now with real approval gate integration
 */

import { getAiosV1Adapter } from "@aios/proxy-core";
import { GateRequirement, ProxyRequest } from "@aios/proxy-core";
import { auth } from "@/lib/auth";
import { ensureApprovedAction, recordApprovalArtifact } from "./approval-gate";
import { getCollaborationServices } from "../collaboration/server";

/** 세션에서 사용자 ID 추출 */
async function getUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id ?? "anonymous";
}

/** 요청을 ProxyRequest로 변환 */
async function toProxyRequest(
  req: Request,
  path: string,
): Promise<ProxyRequest> {
  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: unknown = undefined;
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      body = await req.json();
    } catch {
      body = undefined;
    }
  }

  return { method: req.method, path, headers, body, query };
}

/** 게이트 체크 결과 */
interface GateCheckResult {
  allowed: boolean;
  response?: Response;
  approval?: import("@aios/domain").ApprovalRequest;
}

/** 게이트 요구사항 체크 및 응답 생성 - 실제 승인 게이트 연동 */
async function checkGateAndRespond(
  proxyReq: ProxyRequest,
  gate: GateRequirement,
  userId: string,
  assignmentId: string,
  target: string,
): Promise<GateCheckResult> {
  if (gate === "none") return { allowed: true };

  // 개발 환경에서는 자동 승인 (테스트 용이성)
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[Gate] ${gate} check for ${proxyReq.method} ${proxyReq.path} - user: ${userId} (DEV MODE: auto-approved)`,
    );
    return { allowed: true };
  }

  // 프로덕션: 실제 승인 게이트 연동
  const approvalId =
    proxyReq.body &&
    typeof proxyReq.body === "object" &&
    "approvalId" in proxyReq.body &&
    typeof proxyReq.body.approvalId === "string"
      ? proxyReq.body.approvalId
      : proxyReq.headers["x-approval-id"];

  const gateResult = await ensureApprovedAction({
    approvalId,
    assignmentId: `${assignmentId}-${proxyReq.method}-${proxyReq.path}`,
    requestedBy: userId,
    actionType: gate as
      | "deploy"
      | "external-share"
      | "data-mutation"
      | "config-change"
      | "device-control"
      | "financial"
      | "user-management",
    target,
    context: {
      ...proxyReq.query,
      ...((proxyReq.body as object) || {}),
      method: proxyReq.method,
      path: proxyReq.path,
    },
  });

  if (!gateResult.allowed) {
    return { allowed: false, response: gateResult.response };
  }

  // allowed === true일 때만 approval 접근 가능
  const approval = (
    gateResult as {
      allowed: true;
      approval: import("@aios/domain").ApprovalRequest;
    }
  ).approval;
  return { allowed: true, approval };
}

/** 통합 프록시 핸들러 팩토리 */
export function createAiosV1ProxyHandler(
  upstreamPath: string,
  gate: GateRequirement,
  assignmentIdPrefix: string = "aios-v1",
  targetDescription?: string,
) {
  return async (
    req: Request,
    context?: { params?: Promise<Record<string, string>> },
  ) => {
    try {
      const resolvedParams = await (context?.params ?? Promise.resolve({}));
      let fullPath = upstreamPath;

      // 경로 파라미터 치환 ([id] -> 실제 값)
      for (const [key, value] of Object.entries(resolvedParams)) {
        fullPath = fullPath.replace(`[${key}]`, String(value));
      }

      const adapter = getAiosV1Adapter();
      const userId = await getUserId();
      const proxyReq = await toProxyRequest(req, fullPath);

      // 게이트 확인
      const targetDesc =
        targetDescription || `AIOS v1: ${req.method} ${fullPath}`;
      const gateResult = await checkGateAndRespond(
        proxyReq,
        gate,
        userId,
        assignmentIdPrefix,
        targetDesc,
      );
      if (!gateResult.allowed && gateResult.response)
        return gateResult.response;

      // 프록시 실행
      const response = await adapter.request(proxyReq);

      // 승인된 경우 아티팩트 기록 (success/완료된 경우)
      if (
        gate !== "none" &&
        process.env.NODE_ENV === "production" &&
        response.status < 500
      ) {
        if (gateResult.approval && gateResult.approval.status === "approved") {
          await recordApprovalArtifact(
            gateResult.approval,
            `${targetDesc} 완료`,
          );
        }
      }

      return new Response(JSON.stringify(response.data), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...response.headers },
      });
    } catch (error) {
      console.error(`[AIOS v1 Proxy] ${upstreamPath}:`, error);
      return new Response(
        JSON.stringify({
          error: "Proxy error",
          message: error instanceof Error ? error.message : "Unknown error",
          upstream: "aios-v1",
          path: upstreamPath,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
}
