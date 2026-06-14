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
    const branch = typeof body.branch === "string" ? body.branch : undefined;
    const baseSha = typeof body.baseSha === "string" ? body.baseSha : undefined;

    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "github-create-branch",
      requestedBy:
        typeof body.requestedBy === "string" ? body.requestedBy : "opencode",
      actionType: "external-share",
      target: `github branch: ${owner}/${repo}#${branch}`,
      context: { owner, repo, branch, baseSha },
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

    if (!owner || !repo || !branch || !baseSha) {
      return NextResponse.json(
        { success: false, error: "owner, repo, branch, baseSha are required" },
        { status: 400 },
      );
    }

    const {
      approvalId: _approvalId,
      requestedBy: _requestedBy,
      ..._body
    } = body;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: baseSha,
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
      `GitHub branch created: ${owner}/${repo}#${branch}`,
    );

    return NextResponse.json({
      success: response.ok,
      approvalStatus: "approved",
      approvalId: gate.approval.id,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GitHub branch creation error:", message);
    return NextResponse.json(
      { error: "GitHub branch creation failed", details: message },
      { status: 500 },
    );
  }
}
