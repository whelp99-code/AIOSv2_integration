import { NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "@/lib/integrations/approval-gate";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvalId =
      typeof body.approvalId === "string" ? body.approvalId : undefined;
    const to = typeof body.to === "string" ? body.to : "unknown";
    const existingSendRequestId =
      typeof body.sendRequestId === "string" ? body.sendRequestId : undefined;

    if (!existingSendRequestId && approvalId) {
      return NextResponse.json(
        {
          success: false,
          error: "approvalId 재요청에는 sendRequestId가 필요합니다.",
        },
        { status: 400 },
      );
    }

    let sendRequestId = existingSendRequestId;
    if (!sendRequestId) {
      const queued = await fetchMailIntelligence("/api/outlook/send-request", {
        method: "POST",
        body: JSON.stringify({ ...body, queueOnly: true }),
      });
      if (!queued.response.ok) {
        return NextResponse.json(queued.data, {
          status: queued.response.status,
        });
      }
      const queuedData = queued.data as { requestId?: unknown };
      if (typeof queuedData.requestId !== "string") {
        return NextResponse.json(
          { success: false, error: "메일 대기 요청 ID를 받지 못했습니다." },
          { status: 502 },
        );
      }
      sendRequestId = queuedData.requestId;
    }

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: `mail-send:${sendRequestId}`,
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "portal-user",
      actionType: "send",
      target: `mail send request: ${sendRequestId}`,
      context: { sendRequestId, to, subject: body.subject },
    });

    if (!gate.allowed) {
      const gateData = await gate.response.json();
      return NextResponse.json(
        { ...gateData, sendRequestId },
        { status: gate.response.status },
      );
    }

    const { response, data } = await fetchMailIntelligence(
      `/api/outlook/send-requests/${encodeURIComponent(sendRequestId)}/complete`,
      {
        method: "POST",
        body: JSON.stringify({ approvalId: gate.approval.id }),
        approvalId: gate.approval.id,
      },
    );

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    await recordApprovalArtifact(
      gate.approval,
      `Mail send request ${sendRequestId} completed for ${to}`,
    );

    return NextResponse.json({
      success: true,
      approvalStatus: "sent",
      approvalId: gate.approval.id,
      sendRequestId,
      ...(typeof data === "object" && data !== null ? data : { result: data }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Mail send failed",
      },
      { status: 500 },
    );
  }
}
