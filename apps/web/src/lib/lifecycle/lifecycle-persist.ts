/**
 * Bridges in-memory lifecycle use cases with optional Prisma persistence.
 */

import type {
  CustomerCandidate,
  PartnerCandidate,
  Opportunity,
  Proposal,
  LifecycleProject,
  Estimate,
  ProposalDocument,
  POCPlan,
  ProjectCompletion,
  CfoHandoff,
  CustomerProduct,
  MaintenanceCase,
  AgentTask,
  LifecycleWorkflowRun,
  ImprovementTask,
  DevProject,
  SolutionCandidate,
} from "@aios/domain";
import {
  isLifecyclePersistenceAvailable,
  upsertLifecycleRecord,
  type LifecycleEntityType,
} from "@aios/db";

async function persist(
  entityType: LifecycleEntityType,
  entity: {
    id: string;
    status?: string;
    domain?: string;
    sourceThreadKey?: string;
    projectId?: string;
    userId?: string;
  },
  payload: Record<string, unknown>,
): Promise<void> {
  if (!(await isLifecyclePersistenceAvailable())) return;
  await upsertLifecycleRecord({
    id: entity.id,
    entityType,
    status: entity.status || "draft",
    payload,
    domain: entity.domain,
    sourceThreadKey:
      entity.sourceThreadKey ||
      (typeof payload.sourceThreadKey === "string"
        ? payload.sourceThreadKey
        : undefined),
    projectId:
      entity.projectId ||
      (typeof payload.projectId === "string" ? payload.projectId : undefined),
    userId: entity.userId,
  });
}

export async function persistCustomerCandidate(
  customer: CustomerCandidate,
): Promise<void> {
  await persist(
    "customer_candidate",
    customer,
    customer as unknown as Record<string, unknown>,
  );
}

export async function persistPartnerCandidate(
  partner: PartnerCandidate,
): Promise<void> {
  await persist(
    "partner_candidate",
    partner,
    partner as unknown as Record<string, unknown>,
  );
}

export async function persistOpportunity(opp: Opportunity): Promise<void> {
  await persist("opportunity", opp, opp as unknown as Record<string, unknown>);
}

export async function persistProposal(proposal: Proposal): Promise<void> {
  await persist(
    "sales_proposal",
    proposal,
    proposal as unknown as Record<string, unknown>,
  );
}

export async function persistLifecycleProject(
  project: LifecycleProject,
): Promise<void> {
  await persist(
    "lifecycle_project",
    { ...project, projectId: project.id },
    project as unknown as Record<string, unknown>,
  );
}

export async function persistEstimate(estimate: Estimate): Promise<void> {
  await persist(
    "estimate",
    { ...estimate, projectId: estimate.projectId },
    estimate as unknown as Record<string, unknown>,
  );
}

export async function persistProposalDocument(
  doc: ProposalDocument,
): Promise<void> {
  await persist(
    "proposal_document",
    { ...doc, projectId: doc.projectId },
    doc as unknown as Record<string, unknown>,
  );
}

export async function persistPocPlan(plan: POCPlan): Promise<void> {
  await persist(
    "poc_plan",
    { ...plan, projectId: plan.projectId },
    plan as unknown as Record<string, unknown>,
  );
}

export async function persistProjectCompletion(
  completion: ProjectCompletion,
): Promise<void> {
  await persist(
    "project_completion",
    { ...completion, projectId: completion.projectId },
    completion as unknown as Record<string, unknown>,
  );
}

export async function persistCfoHandoff(handoff: CfoHandoff): Promise<void> {
  await persist(
    "cfo_handoff",
    { ...handoff, projectId: handoff.projectId },
    handoff as unknown as Record<string, unknown>,
  );
}

export async function persistCustomerProduct(
  product: CustomerProduct,
): Promise<void> {
  await persist(
    "customer_product",
    product,
    product as unknown as Record<string, unknown>,
  );
}

export async function persistMaintenanceCase(
  maintenanceCase: MaintenanceCase,
): Promise<void> {
  await persist(
    "maintenance_case",
    maintenanceCase,
    maintenanceCase as unknown as Record<string, unknown>,
  );
}

export async function persistAgentTask(task: AgentTask): Promise<void> {
  await persist("agent_task", task, task as unknown as Record<string, unknown>);
}

export async function persistWorkflowRun(
  run: LifecycleWorkflowRun,
): Promise<void> {
  await persist("workflow_run", run, run as unknown as Record<string, unknown>);
}

export async function persistImprovementTask(
  task: ImprovementTask,
): Promise<void> {
  await persist(
    "improvement_task",
    task,
    task as unknown as Record<string, unknown>,
  );
}

export async function persistDevProject(project: DevProject): Promise<void> {
  await persist(
    "dev_project",
    project,
    project as unknown as Record<string, unknown>,
  );
}

export async function persistSolutionCandidate(
  candidate: SolutionCandidate,
): Promise<void> {
  await persist(
    "solution_candidate",
    candidate,
    candidate as unknown as Record<string, unknown>,
  );
}

export async function getPersistenceStatus(): Promise<{
  available: boolean;
  mode: "prisma" | "memory";
}> {
  const available = await isLifecyclePersistenceAvailable();
  return { available, mode: available ? "prisma" : "memory" };
}
