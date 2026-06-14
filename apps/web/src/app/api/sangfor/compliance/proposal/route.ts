import { NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "../../../../../lib/integrations/approval-gate";
import { getSangforMcpUrl } from "../../../../../lib/integrations/upstream-urls";
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
      assignmentId: "sangfor-compliance-proposal",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "external-share",
      target: "sangfor compliance proposal",
      context: {},
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const {
      approvalId: _approvalId,
      requestedBy: _requestedBy,
      ...payload
    } = body;

    const result = await proxyUpstreamJson({
      baseUrl: getSangforMcpUrl(),
      path: "/api/compliance/proposal",
      method: "POST",
      body: payload,
    });

    await recordApprovalArtifact(
      gate.approval,
      "Sangfor compliance proposal submitted",
    );

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: result.data,
    });
  } catch (error) {
    return upstreamErrorResponse(
      "Sangfor compliance proposal proxy error",
      error,
      500,
    );
  }
}
