import { type NextRequest, NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "../../../../../lib/integrations/approval-gate";
import { getVibeCodingOsUrl } from "../../../../../lib/integrations/upstream-urls";
import {
  proxyUpstreamJson,
  upstreamErrorResponse,
  upstreamProxyResponse,
} from "../../../../../lib/integrations/upstream-proxy";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const path = query
      ? `/api/learning/schedules?${query}`
      : "/api/learning/schedules";

    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path,
    });
    return upstreamProxyResponse(result);
  } catch (error) {
    return upstreamErrorResponse(
      "vibe-coding learning schedules proxy error",
      error,
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvalId =
      typeof body.approvalId === "string" ? body.approvalId : undefined;

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "vibe-learning-schedule",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "deploy",
      target: "vibe-coding learning schedule",
      context: {},
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const { approvalId: _ignored, requestedBy: _req, ...payload } = body;

    const result = await proxyUpstreamJson({
      baseUrl: getVibeCodingOsUrl(),
      path: "/api/learning/schedules",
      method: "POST",
      body: payload,
    });

    if (!result.ok) {
      return NextResponse.json(result.data, { status: result.status });
    }

    await recordApprovalArtifact(
      gate.approval,
      "vibe-coding learning schedule created",
    );

    return NextResponse.json({
      success: true,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: result.data,
    });
  } catch (error) {
    return upstreamErrorResponse(
      "vibe-coding learning schedule proxy error",
      error,
      500,
    );
  }
}
