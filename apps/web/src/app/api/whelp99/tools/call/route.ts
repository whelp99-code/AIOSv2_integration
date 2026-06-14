import { NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "@/lib/integrations/approval-gate";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvalId =
      typeof body.approvalId === "string" ? body.approvalId : undefined;
    const toolName = typeof body.name === "string" ? body.name : "unknown";

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "whelp99-tool-call",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "device-control",
      target: `whelp99 tool call: ${toolName}`,
      context: { toolName },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const mcpUrl = process.env.WHELP99_MCP_HTTP_URL;
    if (!mcpUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "WHELP99_MCP_HTTP_URL not configured",
          approvalStatus: "approved",
        },
        { status: 503 },
      );
    }

    const {
      approvalId: _approvalId,
      requestedBy: _requestedBy,
      ...payload
    } = body;

    const response = await fetch(`${mcpUrl}/tools/call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    await recordApprovalArtifact(
      gate.approval,
      `WHELP99 tool call: ${toolName}`,
    );

    return NextResponse.json({
      success: response.ok,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("WHELP99 tool call error:", message);
    return NextResponse.json(
      { error: "WHELP99 tool call failed", details: message },
      { status: 500 },
    );
  }
}
