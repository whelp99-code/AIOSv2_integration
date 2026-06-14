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
    const owner = typeof body.owner === "string" ? body.owner : undefined;
    const repo = typeof body.repo === "string" ? body.repo : undefined;
    const title = typeof body.title === "string" ? body.title : undefined;
    const head = typeof body.head === "string" ? body.head : undefined;
    const base = typeof body.base === "string" ? body.base : undefined;

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "github-create-pr",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "external-share",
      target: `github PR: ${owner}/${repo} - ${title}`,
      context: { owner, repo, title, head, base },
    });

    if (!gate.allowed) {
      return gate.response;
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "GITHUB_TOKEN not configured",
          approvalStatus: "approved",
        },
        { status: 503 },
      );
    }

    if (!owner || !repo || !title || !head || !base) {
      return NextResponse.json(
        {
          success: false,
          error: "owner, repo, title, head, base are required",
        },
        { status: 400 },
      );
    }

    const {
      approvalId: _approvalId,
      requestedBy: _requestedBy,
      ...payload
    } = body;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          title: payload.title,
          head: payload.head,
          base: payload.base,
          body: payload.body,
          draft: payload.draft ?? false,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    await recordApprovalArtifact(
      gate.approval,
      `GitHub PR created: ${owner}/${repo} - ${title}`,
    );

    return NextResponse.json({
      success: response.ok,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GitHub PR creation error:", message);
    return NextResponse.json(
      { error: "GitHub PR creation failed", details: message },
      { status: 500 },
    );
  }
}
