import { NextResponse } from "next/server";
import { promoteProposalToProjectWithPersistence } from "@/lib/lifecycle/lifecycle-mutations";
import { jsonOk, parseJsonBody } from "@/lib/lifecycle/lifecycle-api";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await parseJsonBody<{
      projectName?: string;
      description?: string;
      requestedBy?: string;
    }>(request);

    const project = await promoteProposalToProjectWithPersistence({
      proposalId: id,
      projectName: body.projectName || "New Project",
      description: body.description,
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    return jsonOk({ project }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Project promotion failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
