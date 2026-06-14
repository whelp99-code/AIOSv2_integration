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

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "slack-send-message",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "send",
      target: "slack message send",
      context: {},
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "SLACK_WEBHOOK_URL not configured",
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

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Slack webhook returned an error",
          upstreamStatus: response.status,
          result: data,
        },
        { status: response.status },
      );
    }

    await recordApprovalArtifact(
      gate.approval,
      "Slack message sent via webhook",
    );

    return NextResponse.json({
      success: response.ok,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Slack send error:", message);
    return NextResponse.json(
      { error: "Slack send failed", details: message },
      { status: 500 },
    );
  }
}
