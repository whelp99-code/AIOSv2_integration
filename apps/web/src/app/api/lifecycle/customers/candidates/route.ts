import { NextResponse } from "next/server";
import {
  createCustomerOrPartnerCandidateFromMail,
  jsonError,
  jsonOk,
  parseJsonBody,
} from "@/lib/lifecycle/lifecycle-api";

export async function GET() {
  const store = await import("@/lib/lifecycle/lifecycle-api").then((m) =>
    m.getLifecycleStore(),
  );
  return jsonOk({
    customers: [...store.customers.values()],
    partners: [...store.partners.values()],
  });
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      entityRole?: "customer" | "partner";
      domain?: string;
      candidateName?: string;
      contacts?: Array<{ name?: string; email?: string; phone?: string }>;
      interests?: string[];
      solutions?: string[];
      painPoints?: string[];
      sourceThreadKey?: string;
      sampleSubjects?: string[];
      confidence?: number;
      requestedBy?: string;
    }>(request);

    if (!body.entityRole || !body.sourceThreadKey) {
      return jsonError("entityRole and sourceThreadKey are required");
    }

    const result = createCustomerOrPartnerCandidateFromMail({
      entityRole: body.entityRole,
      domain: body.domain,
      candidateName: body.candidateName,
      contacts: body.contacts,
      interests: body.interests,
      solutions: body.solutions,
      painPoints: body.painPoints,
      sourceThreadKey: body.sourceThreadKey,
      sampleSubjects: body.sampleSubjects,
      confidence: body.confidence,
      requestedBy: body.requestedBy || "mail-hub",
    });

    return jsonOk({ candidate: result }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Candidate creation failed",
      500,
    );
  }
}
