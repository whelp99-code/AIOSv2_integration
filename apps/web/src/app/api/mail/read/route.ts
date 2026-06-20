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
    const messageId = String(body.messageId || "unknown");

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "mail-mark-read",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "portal-user",
      actionType: "data-mutation",
      target: `mail mark read: ${messageId}`,
      context: { messageId, isRead: body.isRead !== false },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const { response, data } = await fetchMailIntelligence("/api/outlook/read", {
      method: "POST",
      body: JSON.stringify(body),
      approvalId: gate.approval.id,
    });

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    await recordApprovalArtifact(
      gate.approval,
      `Mail read state updated: ${messageId}`,
    );

    return NextResponse.json({
      success: true,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      ...(typeof data === "object" && data !== null ? data : { result: data }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Mail read update failed",
      },
      { status: 500 },
    );
  }
}
