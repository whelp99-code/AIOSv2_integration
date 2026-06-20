import { NextResponse } from "next/server";
import {
  createOpportunityWithPersistence,
  promoteOpportunityToProposalWithPersistence,
} from "@/lib/lifecycle/lifecycle-mutations";
import {
  getHydratedLifecycleStore,
  jsonError,
  jsonOk,
  parseJsonBody,
} from "@/lib/lifecycle/lifecycle-api";

export async function GET() {
  const store = await getHydratedLifecycleStore();
  return jsonOk({ opportunities: [...store.opportunities.values()] });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      customerId?: string;
      partnerId?: string;
      threadKey?: string;
      title?: string;
      summary?: string;
      interestedSolutions?: string[];
      painPoints?: string[];
      messageIds?: string[];
      requestedBy?: string;
    }>(request);

    if (!body.threadKey || !body.title || !body.messageIds?.length) {
      return jsonError("threadKey, title, and messageIds are required");
    }

    const opportunity = await createOpportunityWithPersistence({
      customerId: body.customerId,
      partnerId: body.partnerId,
      threadKey: body.threadKey,
      title: body.title,
      summary: body.summary,
      interestedSolutions: body.interestedSolutions,
      painPoints: body.painPoints,
      messageIds: body.messageIds,
      requestedBy: body.requestedBy || "mail-hub",
    });

    return jsonOk({ opportunity }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Opportunity creation failed",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await parseJsonBody<{
      opportunityId?: string;
      estimateRequired?: boolean;
      pocRequired?: boolean;
      requestedBy?: string;
    }>(request);

    if (!body.opportunityId) {
      return jsonError("opportunityId is required");
    }

    const proposal = await promoteOpportunityToProposalWithPersistence({
      opportunityId: body.opportunityId,
      estimateRequired: body.estimateRequired,
      pocRequired: body.pocRequired,
      requestedBy: body.requestedBy || "lifecycle-api",
    });

    return jsonOk({ proposal }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Promotion failed";
    const status = message.includes("Invalid transition") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
