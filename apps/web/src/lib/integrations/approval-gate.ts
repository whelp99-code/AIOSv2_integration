import { NextResponse } from "next/server";
import type { ApprovalActionType, ApprovalRequest } from "@aios/domain";
import { getCollaborationServices } from "../collaboration/server";

export const COLLABORATION_SESSION_ID = "cursor-opencode-main-session";

export interface GatedActionInput {
  approvalId?: string;
  assignmentId: string;
  requestedBy: string;
  actionType: ApprovalActionType;
  target: string;
  context?: Record<string, unknown>;
}

export type GatedActionResult =
  | { allowed: true; approval: ApprovalRequest }
  | { allowed: false; response: NextResponse };

export async function ensureApprovedAction(
  input: GatedActionInput,
): Promise<GatedActionResult> {
  const { approvalStore } = getCollaborationServices();

  if (!input.approvalId) {
    const approval = await approvalStore.create({
      type: "destructive-action",
      sessionId: COLLABORATION_SESSION_ID,
      assignmentId: input.assignmentId,
      requester: input.requestedBy,
      requestedBy: input.requestedBy,
      actionType: input.actionType,
      target: input.target,
      context: input.context ?? {},
      status: "pending",
    });

    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          approvalStatus: "pending",
          approval,
          error: "승인이 필요합니다. approvalId로 재요청하세요.",
        },
        { status: 409 },
      ),
    };
  }

  const approvals = await approvalStore.list();
  const approval = approvals.find((entry) => entry.id === input.approvalId);

  if (!approval) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: "승인 요청을 찾을 수 없습니다." },
        { status: 404 },
      ),
    };
  }

  if (approval.status === "pending") {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          approvalStatus: "pending",
          approval,
          error: "미해결 승인 요청이 남아 있습니다.",
        },
        { status: 409 },
      ),
    };
  }

  if (approval.status !== "approved") {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          approvalStatus: approval.status,
          approval,
          error: `승인되지 않은 요청입니다: ${approval.status}`,
        },
        { status: 403 },
      ),
    };
  }

  if (approval.assignmentId !== input.assignmentId) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: `승인 ID ${input.approvalId}는 assignment ${input.assignmentId}에 속하지 않습니다.`,
        },
        { status: 403 },
      ),
    };
  }

  if (approval.actionType !== input.actionType) {
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          error: `승인 ID ${input.approvalId}는 actionType ${input.actionType}에 대해 유효하지 않습니다.`,
        },
        { status: 403 },
      ),
    };
  }

  return { allowed: true, approval };
}

export async function recordApprovalArtifact(
  approval: ApprovalRequest,
  description: string,
): Promise<void> {
  const { coordinator, approvalStore, evidenceWriter } =
    getCollaborationServices();
  const sessionId = approval.sessionId || COLLABORATION_SESSION_ID;

  await coordinator.addArtifact(sessionId, {
    type: "approval-record",
    path: "",
    description,
    createdAt: new Date(),
    metadata: {
      approvalId: approval.id,
      assignmentId: approval.assignmentId,
      actionType: approval.actionType,
      status: approval.status,
    },
  });

  const session = await coordinator.getSession(sessionId);
  if (session) {
    const approvals = await approvalStore.list();
    await evidenceWriter.writeSessionSummary(session, approvals);
  }
}
