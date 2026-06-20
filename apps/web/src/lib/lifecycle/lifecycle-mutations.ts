/**
 * Lifecycle mutations with optional Prisma persistence after in-memory write.
 */

import type { CustomerCandidate, PartnerCandidate } from "@aios/domain";
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
  linkImprovementToVibeProject,
  promoteOpportunityToProposal,
  promoteProposalToProject,
  requestCfoHandoff,
  startLifecycleWorkflowRun,
} from "@aios/application";
import {
  persistAgentTask,
  persistCfoHandoff,
  persistCustomerCandidate,
  persistCustomerProduct,
  persistDevProject,
  persistEstimate,
  persistImprovementTask,
  persistLifecycleProject,
  persistMaintenanceCase,
  persistOpportunity,
  persistPartnerCandidate,
  persistPocPlan,
  persistProjectCompletion,
  persistProposal,
  persistProposalDocument,
  persistSolutionCandidate,
  persistWorkflowRun,
} from "./lifecycle-persist";
import { ensureLifecycleStoreHydrated } from "./lifecycle-hydrate";

export async function createCustomerOrPartnerCandidateWithPersistence(
  input: Parameters<typeof createCustomerOrPartnerCandidateFromMail>[0],
) {
  await ensureLifecycleStoreHydrated();
  const result = createCustomerOrPartnerCandidateFromMail(input);
  if ("metadata" in result && "domain" in result) {
    if (input.entityRole === "partner") {
      await persistPartnerCandidate(result as PartnerCandidate);
    } else {
      await persistCustomerCandidate(result as CustomerCandidate);
    }
  }
  return result;
}

export async function createOpportunityWithPersistence(
  input: Parameters<typeof createOpportunityFromMailThread>[0],
) {
  await ensureLifecycleStoreHydrated();
  const opportunity = createOpportunityFromMailThread(input);
  await persistOpportunity(opportunity);
  return opportunity;
}

export async function promoteOpportunityToProposalWithPersistence(
  input: Parameters<typeof promoteOpportunityToProposal>[0],
) {
  await ensureLifecycleStoreHydrated();
  const proposal = promoteOpportunityToProposal(input);
  await persistProposal(proposal);
  return proposal;
}

export async function promoteProposalToProjectWithPersistence(
  input: Parameters<typeof promoteProposalToProject>[0],
) {
  await ensureLifecycleStoreHydrated();
  const project = promoteProposalToProject(input);
  await persistLifecycleProject(project);
  return project;
}

export async function createProjectDeliveryPackageWithPersistence(
  input: Parameters<typeof createProjectDeliveryPackage>[0],
) {
  await ensureLifecycleStoreHydrated();
  const delivery = createProjectDeliveryPackage(input);
  if (delivery.estimate) await persistEstimate(delivery.estimate);
  if (delivery.proposalDocument)
    await persistProposalDocument(delivery.proposalDocument);
  if (delivery.pocPlan) await persistPocPlan(delivery.pocPlan);
  return delivery;
}

export async function completeProjectForCfoHandoffWithPersistence(
  input: Parameters<typeof completeProjectForCfoHandoff>[0],
) {
  await ensureLifecycleStoreHydrated();
  const completion = completeProjectForCfoHandoff(input);
  await persistProjectCompletion(completion);
  return completion;
}

export async function requestCfoHandoffWithPersistence(
  input: Parameters<typeof requestCfoHandoff>[0],
  approved: boolean,
) {
  await ensureLifecycleStoreHydrated();
  const handoff = requestCfoHandoff(input, approved);
  await persistCfoHandoff(handoff);
  return handoff;
}

export async function createCustomerProductWithPersistence(
  input: Parameters<typeof createCustomerProductFromProject>[0],
) {
  await ensureLifecycleStoreHydrated();
  const product = createCustomerProductFromProject(input);
  await persistCustomerProduct(product);
  return product;
}

export async function createMaintenanceCaseWithPersistence(
  input: Parameters<typeof createMaintenanceCase>[0],
) {
  await ensureLifecycleStoreHydrated();
  const maintenanceCase = createMaintenanceCase(input);
  await persistMaintenanceCase(maintenanceCase);
  return maintenanceCase;
}

export async function createAgentTaskWithPersistence(
  input: Parameters<typeof createAgentTask>[0],
  options?: { startRun?: boolean; upstreamAvailable?: boolean },
) {
  await ensureLifecycleStoreHydrated();
  const task = createAgentTask(input);
  await persistAgentTask(task);
  if (options?.startRun) {
    const run = startLifecycleWorkflowRun({
      agentTaskId: task.id,
      source: "f-aios-v3",
      requestedBy: input.requestedBy,
      upstreamAvailable: options.upstreamAvailable,
    });
    await persistWorkflowRun(run);
    return { agentTask: task, workflowRun: run };
  }
  return { agentTask: task, workflowRun: null };
}

export async function createImprovementTaskWithPersistence(
  input: Parameters<typeof createImprovementTask>[0],
) {
  await ensureLifecycleStoreHydrated();
  const task = createImprovementTask(input);
  await persistImprovementTask(task);
  return task;
}

export async function linkImprovementToVibeProjectWithPersistence(
  input: Parameters<typeof linkImprovementToVibeProject>[0],
) {
  await ensureLifecycleStoreHydrated();
  const devProject = linkImprovementToVibeProject(input);
  await persistDevProject(devProject);
  return devProject;
}

export async function createSolutionCandidateWithPersistence(
  input: Parameters<typeof createSolutionCandidate>[0],
) {
  await ensureLifecycleStoreHydrated();
  const candidate = createSolutionCandidate(input);
  await persistSolutionCandidate(candidate);
  return candidate;
}
