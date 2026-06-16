import { NextResponse } from "next/server";
import {
  ensureApprovedAction,
  recordApprovalArtifact,
} from "@/lib/integrations/approval-gate";
import {
  completeProjectForCfoHandoff,
  createAgentTask,
  createCustomerOrPartnerCandidateFromMail,
  createCustomerProductFromProject,
  createImprovementTask,
  createMaintenanceCase,
  createOpportunityFromMailThread,
  createProjectDeliveryPackage,
  createSolutionCandidate,
  getLifecycleStore,
  knowledgeIngestDryRun,
  linkImprovementToVibeProject,
  listLifecycleSummary,
  promoteOpportunityToProposal,
  promoteProposalToProject,
  requestCfoHandoff,
  startLifecycleWorkflowRun,
} from "@aios/application";

export { getLifecycleStore, listLifecycleSummary };

export async function parseJsonBody<T extends Record<string, unknown>>(
  request: Request,
): Promise<T> {
  return (await request.json().catch(() => ({}))) as T;
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export {
  createCustomerOrPartnerCandidateFromMail,
  createOpportunityFromMailThread,
  promoteOpportunityToProposal,
  promoteProposalToProject,
  createProjectDeliveryPackage,
  completeProjectForCfoHandoff,
  requestCfoHandoff,
  createCustomerProductFromProject,
  createMaintenanceCase,
  createAgentTask,
  startLifecycleWorkflowRun,
  createImprovementTask,
  linkImprovementToVibeProject,
  createSolutionCandidate,
  knowledgeIngestDryRun,
};

export async function gatedExternalShare(
  request: Request,
  assignmentId: string,
  target: string,
  context: Record<string, unknown>,
): Promise<
  | { allowed: true; approvalId: string }
  | { allowed: false; response: NextResponse }
> {
  const body = await parseJsonBody<{
    approvalId?: string;
    requestedBy?: string;
  }>(request);
  const gate = await ensureApprovedAction({
    approvalId: body.approvalId,
    assignmentId,
    requestedBy: body.requestedBy || "lifecycle-api",
    actionType: "external-share",
    target,
    context,
  });
  if (!gate.allowed) {
    return { allowed: false, response: gate.response };
  }
  await recordApprovalArtifact(
    gate.approval,
    `External share approved: ${target}`,
  );
  return { allowed: true, approvalId: gate.approval.id };
}

export async function gatedSend(
  request: Request,
  assignmentId: string,
  target: string,
  context: Record<string, unknown>,
  preParsed?: { approvalId?: string; requestedBy?: string },
): Promise<
  | { allowed: true; approvalId: string }
  | { allowed: false; response: NextResponse }
> {
  const body =
    preParsed ??
    (await parseJsonBody<{ approvalId?: string; requestedBy?: string }>(
      request,
    ));
  const gate = await ensureApprovedAction({
    approvalId: body.approvalId,
    assignmentId,
    requestedBy: body.requestedBy || "lifecycle-api",
    actionType: "send",
    target,
    context,
  });
  if (!gate.allowed) {
    return { allowed: false, response: gate.response };
  }
  await recordApprovalArtifact(gate.approval, `Send approved: ${target}`);
  return { allowed: true, approvalId: gate.approval.id };
}

export async function gatedDeviceControl(
  request: Request,
  assignmentId: string,
  target: string,
  preParsed?: { approvalId?: string; requestedBy?: string },
): Promise<
  | { allowed: true; approvalId: string }
  | { allowed: false; response: NextResponse }
> {
  const body =
    preParsed ??
    (await parseJsonBody<{ approvalId?: string; requestedBy?: string }>(
      request,
    ));
  const gate = await ensureApprovedAction({
    approvalId: body.approvalId,
    assignmentId,
    requestedBy: body.requestedBy || "lifecycle-api",
    actionType: "device-control",
    target,
    context: {},
  });
  if (!gate.allowed) {
    return { allowed: false, response: gate.response };
  }
  return { allowed: true, approvalId: gate.approval.id };
}
