import {
  createProjectDeliveryPackage,
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
      includeEstimate?: boolean;
      includeProposal?: boolean;
      includePocPlan?: boolean;
      requestedBy?: string;
    }>(request);

    const delivery = createProjectDeliveryPackage({
      projectId: id,
      includeEstimate: body.includeEstimate ?? true,
      includeProposal: body.includeProposal ?? true,
      includePocPlan: body.includePocPlan ?? false,
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    return jsonOk({ delivery }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Delivery package failed",
      404,
    );
  }
}
