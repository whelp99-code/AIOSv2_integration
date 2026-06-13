/**
 * Unified Approval Middleware
 * Applies approval gates to all write operations across products
 * Integrates with existing @aios/proxy-core gate types and approval-gate.ts
 */

import { NextResponse } from "next/server";
import { ensureApprovedAction, recordApprovalArtifact } from "./approval-gate";
import type { GateRequirement } from "@aios/proxy-core";
import type { ApprovalActionType, ApprovalRequest } from "@aios/domain";

/** 승인 게이트용 액션 타입 (none 제외) */
export type ApprovalGateActionType = Exclude<GateRequirement, "none">;

function requestWithJsonBody(req: Request, body: unknown): Request {
  const headers = new Headers(req.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(body ?? {});
  }

  return new Request(req.url, init);
}

export interface ApprovalGateConfig {
  gate: ApprovalGateActionType;
  assignmentIdPrefix: string;
  targetDescription: string;
  contextBuilder?: (
    body: unknown,
    params: Record<string, string>,
  ) => Record<string, unknown>;
  skipOnDev?: boolean;
}

export interface ApprovedRequestContext {
  approvalId: string;
  approvalStatus: string;
  actionType: ApprovalGateActionType;
  target: string;
  requestedBy: string;
}

/**
 * 미들웨어 팩토리: 승인 게이트가 적용된 핸들러 생성
 */
export function withApprovalGate<TBody = unknown>(config: ApprovalGateConfig) {
  return async (
    handler: (
      req: Request,
      context: ApprovedRequestContext,
      params: Record<string, string>,
    ) => Promise<NextResponse>,
    req: Request,
    paramsPromise: Promise<Record<string, string>>,
  ): Promise<NextResponse> => {
    const params = await paramsPromise;

    // 개발 모드에서 게이트 스킵 (옵션)
    if (config.skipOnDev && process.env.NODE_ENV !== "production") {
      const body =
        req.method !== "GET" ? await req.json().catch(() => ({})) : {};
      const mockContext: ApprovedRequestContext = {
        approvalId: "dev-bypass",
        approvalStatus: "approved",
        actionType: config.gate,
        target: config.targetDescription,
        requestedBy: "dev-user",
      };
      return handler(requestWithJsonBody(req, body), mockContext, params);
    }

    // 요청 바디 파싱 (POST/PUT/PATCH용)
    let body: unknown = {};
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // approvalId 추출 (바디 또는 헤더에서)
    const approvalId =
      body &&
      typeof body === "object" &&
      "approvalId" in body &&
      typeof body.approvalId === "string"
        ? body.approvalId
        : req.headers.get("x-approval-id") || undefined;

    const requestedBy =
      body &&
      typeof body === "object" &&
      "requestedBy" in body &&
      typeof body.requestedBy === "string"
        ? body.requestedBy
        : req.headers.get("x-requested-by") || "api-client";

    // 게이트 요구사항 체크
    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: `${config.assignmentIdPrefix}-${JSON.stringify(params).slice(1, -1)}`,
      requestedBy,
      actionType: config.gate,
      target: config.targetDescription,
      context: config.contextBuilder
        ? config.contextBuilder(body, params)
        : { ...params, ...(body as object) },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    // 승인된 경우 핸들러 실행
    const response = await handler(
      requestWithJsonBody(req, body),
      {
        approvalId: gate.approval.id,
        approvalStatus: gate.approval.status,
        actionType: gate.approval.actionType as ApprovalGateActionType,
        target: gate.approval.target,
        requestedBy: gate.approval.requestedBy,
      },
      params,
    );

    // 성공 시 승인 아티팩트 기록
    if (response.ok || response.status < 500) {
      await recordApprovalArtifact(
        gate.approval,
        `${config.targetDescription} 완료`,
      );
    }

    // 응답에 승인 정보 추가
    const responseData = await response.json().catch(() => ({}));
    return NextResponse.json(
      {
        ...responseData,
        approvalStatus: "approved",
        approvalId: gate.approval.id,
      },
      { status: response.status },
    );
  };
}

/**
 * 상위 레벨 헬퍼: 간단한 POST/PUT/DELETE 핸들러에 승인 게이트 적용
 */
export function createGatedHandler(
  gate: ApprovalGateActionType,
  assignmentId: string,
  target: string,
  handler: (
    req: Request,
    approvalContext: ApprovedRequestContext,
  ) => Promise<NextResponse>,
  contextBuilder?: (body: unknown) => Record<string, unknown>,
) {
  return async (req: Request): Promise<NextResponse> => {
    // 개발 모드 우회
    if (process.env.NODE_ENV !== "production") {
      const body =
        req.method !== "GET" ? await req.json().catch(() => ({})) : {};
      return handler(requestWithJsonBody(req, body), {
        approvalId: "dev-bypass",
        approvalStatus: "approved",
        actionType: gate,
        target,
        requestedBy: "dev-user",
      });
    }

    let body: unknown = {};
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const approvalId =
      body &&
      typeof body === "object" &&
      "approvalId" in body &&
      typeof body.approvalId === "string"
        ? body.approvalId
        : req.headers.get("x-approval-id") || undefined;

    const requestedBy =
      body &&
      typeof body === "object" &&
      "requestedBy" in body &&
      typeof body.requestedBy === "string"
        ? body.requestedBy
        : req.headers.get("x-requested-by") || "api-client";

    const gateResult = await ensureApprovedAction({
      approvalId,
      assignmentId,
      requestedBy,
      actionType: gate,
      target,
      context: contextBuilder
        ? contextBuilder(body)
        : (body as Record<string, unknown>),
    });

    if (!gateResult.allowed) {
      return gateResult.response;
    }

    // ApprovedRequestContext 생성 (기존 ApprovalRequest에서 변환)
    const approvalContext: ApprovedRequestContext = {
      approvalId: gateResult.approval.id,
      approvalStatus: gateResult.approval.status,
      actionType: gateResult.approval.actionType as ApprovalGateActionType,
      target: gateResult.approval.target,
      requestedBy: gateResult.approval.requestedBy,
    };

    const response = await handler(
      requestWithJsonBody(req, body),
      approvalContext,
    );

    if (response.ok || response.status < 500) {
      await recordApprovalArtifact(gateResult.approval, `${target} 완료`);
    }

    const responseData = await response.json().catch(() => ({}));
    return NextResponse.json(
      {
        ...responseData,
        approvalStatus: "approved",
        approvalId: gateResult.approval.id,
      },
      { status: response.status },
    );
  };
}

/** 미리 정의된 게이트 설정들 */
export const GATE_PRESETS = {
  // Deploy 게이트 - 배포/실행
  workflowExecute: (workflowId: string) => ({
    gate: "deploy" as ApprovalGateActionType,
    assignmentId: `workflow-execute-${workflowId}`,
    target: `워크플로우 실행: ${workflowId}`,
  }),
  workflowCreate: () => ({
    gate: "deploy" as ApprovalGateActionType,
    assignmentId: "workflow-create",
    target: "워크플로우 생성",
  }),
  automationExecute: (workflowId: string) => ({
    gate: "deploy" as ApprovalGateActionType,
    assignmentId: `automation-execute-${workflowId}`,
    target: `자동화 워크플로우 실행: ${workflowId}`,
  }),
  sangforExecute: (workflowId: string) => ({
    gate: "device-control" as ApprovalGateActionType,
    assignmentId: `sangfor-execute-${workflowId}`,
    target: `Sangfor 워크플로우 실행: ${workflowId}`,
  }),
  vibeIngest: () => ({
    gate: "deploy" as ApprovalGateActionType,
    assignmentId: "vibe-rag-ingest",
    target: "Vibe Coding RAG 문서 수집",
  }),

  // Data Mutation 게이트 - CRUD 쓰기
  customerCreate: () => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: "customer-create",
    target: "고객 생성",
  }),
  customerUpdate: (id: string) => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: `customer-update-${id}`,
    target: `고객 수정: ${id}`,
  }),
  customerDelete: (id: string) => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: `customer-delete-${id}`,
    target: `고객 삭제: ${id}`,
  }),
  partnerCreate: () => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: "partner-create",
    target: "파트너 생성",
  }),
  partnerUpdate: (id: string) => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: `partner-update-${id}`,
    target: `파트너 수정: ${id}`,
  }),
  partnerDelete: (id: string) => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: `partner-delete-${id}`,
    target: `파트너 삭제: ${id}`,
  }),
  taskCreate: () => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: "task-create",
    target: "작업 생성",
  }),
  knowledgeCreate: () => ({
    gate: "data-mutation" as ApprovalGateActionType,
    assignmentId: "knowledge-create",
    target: "지식 베이스 생성",
  }),
  mailImport: () => ({
    gate: "external-share" as ApprovalGateActionType,
    assignmentId: "mail-import",
    target: "메일 가져오기 (외부 데이터)",
  }),

  // Config Change 게이트 - 설정 변경
  githubWebhook: () => ({
    gate: "config-change" as ApprovalGateActionType,
    assignmentId: "github-webhook",
    target: "GitHub 웹훅 설정",
  }),
  githubRepo: () => ({
    gate: "config-change" as ApprovalGateActionType,
    assignmentId: "github-repo-config",
    target: "GitHub 저장소 설정",
  }),
  riskConfig: () => ({
    gate: "config-change" as ApprovalGateActionType,
    assignmentId: "risk-config",
    target: "리스크 설정 변경",
  }),

  // External Share 게이트 - 외부 공유
  documentShare: () => ({
    gate: "external-share" as ApprovalGateActionType,
    assignmentId: "document-share",
    target: "문서 외부 공유",
  }),
} as const;

export type GatePresetKey = keyof typeof GATE_PRESETS;
