import {
  completeProjectForCfoHandoffWithPersistence,
  requestCfoHandoffWithPersistence,
} from "@/lib/lifecycle/lifecycle-mutations";
import {
  gatedSend,
  jsonError,
  jsonOk,
  parseJsonBody,
} from "@/lib/lifecycle/lifecycle-api";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await parseJsonBody<{
      estimateId?: string;
      completionSummary?: string;
      requestedBy?: string;
      action?: "complete" | "cfo-handoff";
      projectCompletionId?: string;
      approvalId?: string;
    }>(request);

    if (body.action === "cfo-handoff") {
      if (!body.projectCompletionId) {
        return jsonError("projectCompletionId is required for cfo-handoff");
      }
      const gate = await gatedSend(
        request,
        "cfo-handoff",
        `CFO handoff for project ${id}`,
        { projectId: id, projectCompletionId: body.projectCompletionId },
        { approvalId: body.approvalId, requestedBy: body.requestedBy },
      );
      if (!gate.allowed) {
        return gate.response;
      }
      const handoff = await requestCfoHandoffWithPersistence(
        {
          projectCompletionId: body.projectCompletionId,
          approvalId: gate.approvalId,
          requestedBy: body.requestedBy || "lifecycle-api",
        },
        true,
      );
      return jsonOk({ handoff, approvalId: gate.approvalId });
    }

    const completion = await completeProjectForCfoHandoffWithPersistence({
      projectId: id,
      estimateId: body.estimateId,
      completionSummary:
        body.completionSummary || "Project completed — draft package",
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    return jsonOk({ completion }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Completion failed",
      500,
    );
  }
}
