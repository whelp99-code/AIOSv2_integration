import { NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "../../../../../lib/integrations/approval-gate";
import { getVibeCodingOsUrl } from "../../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
} from "../../../../../lib/integrations/upstream-proxy";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvalId =
      typeof body.approvalId === "string" ? body.approvalId : undefined;

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "vibe-sandbox-run",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "deploy",
      target: "vibe-coding sandbox run",
      context: {},
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const { approvalId: _ignored, requestedBy: _req, ...payload } = body;

    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path: "/api/sandbox/run",
      method: "POST",
      body: payload,
    });

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status });
    }

    await recordApprovalArtifact(
      gate.approval,
      "vibe-coding sandbox run executed",
    );

    return NextResponse.json({
      success: true,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: result.data,
    });
  } catch (error) {
    return upstreamErrorResponse(
      "vibe-coding sandbox run proxy error",
      error,
      500,
    );
  }
}
