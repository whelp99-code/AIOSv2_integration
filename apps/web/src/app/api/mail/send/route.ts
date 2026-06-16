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

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "mail-send",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "portal-user",
      actionType: "send",
      target: `mail send: ${to}`,
      context: { to, subject: body.subject },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const { response, data } = await fetchMailIntelligence("/api/outlook/send", {
      method: "POST",
      body: JSON.stringify(body),
      approvalId: gate.approval.id,
    });

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    await recordApprovalArtifact(gate.approval, `Mail sent to ${to}`);

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
        error: error instanceof Error ? error.message : "Mail send failed",
      },
      { status: 500 },
    );
  }
}
