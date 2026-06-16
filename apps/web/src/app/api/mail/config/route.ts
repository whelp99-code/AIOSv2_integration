import { NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "@/lib/integrations/approval-gate";
import { fetchMailIntelligence } from "@/lib/integrations/mail-intelligence-proxy";

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvalId =
      typeof body.approvalId === "string" ? body.approvalId : undefined;

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "mail-config-delete",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "portal-user",
      actionType: "config-change",
      target: "mail-intelligence outlook config",
      context: {},
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const { response, data } = await fetchMailIntelligence("/api/outlook/config", {
      method: "DELETE",
      approvalId: gate.approval.id,
    });

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    await recordApprovalArtifact(gate.approval, "Mail Intelligence config cleared");

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
        error: error instanceof Error ? error.message : "Config delete failed",
      },
      { status: 500 },
    );
  }
}
