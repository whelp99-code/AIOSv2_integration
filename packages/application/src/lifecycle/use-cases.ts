/**
 * Lifecycle use cases — C2 through C9 public interfaces.
 */

import type {
  AgentTask,
  AgentTaskType,
  CfoHandoff,
  CompleteProjectForCfoHandoffInput,
  CreateCustomerOrPartnerCandidateInput,
  CreateOpportunityFromMailThreadInput,
  CreateProjectDeliveryPackageInput,
  CustomerCandidate,
  CustomerProduct,
  DevProject,
  Estimate,
  ImprovementTask,
  LifecycleProject,
  LifecycleWorkflowRun,
  MaintenanceCase,
  Opportunity,
  POCPlan,
  PartnerCandidate,
  ProjectCompletion,
  PromoteOpportunityToProposalInput,
  PromoteProposalToProjectInput,
  Proposal,
  ProposalDocument,
  RequestCfoHandoffInput,
  SolutionCandidate,
  KnowledgeIngestCandidate,
} from "@aios/domain";
import { getLifecycleStore } from "./lifecycle-store";

const DEFAULT_USER = "system";

export function createCustomerOrPartnerCandidateFromMail(
  input: CreateCustomerOrPartnerCandidateInput,
): CustomerCandidate | PartnerCandidate {
  const store = getLifecycleStore();
  const now = new Date();
  const metadata = {
    sourceThreadKey: input.sourceThreadKey,
    sampleSubjects: input.sampleSubjects,
    confidence: input.confidence,
    requestedBy: input.requestedBy,
    interests: input.interests,
    solutions: input.solutions,
    painPoints: input.painPoints,
  };

  if (input.entityRole === "partner") {
    const existing = input.domain
      ? store.findPartnerByDomain(input.domain)
      : undefined;
    if (existing) {
      const updated: PartnerCandidate = {
        ...existing,
        name: input.candidateName || existing.name,
        metadata: { ...existing.metadata, ...metadata },
        updatedAt: now,
      };
      store.partners.set(updated.id, updated);
      return updated;
    }
    const partner: PartnerCandidate = {
      id: store.nextId("partner"),
      name: input.candidateName || input.domain || "Unknown Partner",
      domain: input.domain,
      type: "partner",
      status: "candidate",
      userId: input.userId || DEFAULT_USER,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    store.partners.set(partner.id, partner);
    return partner;
  }

  const existing = input.domain
    ? store.findCustomerByDomain(input.domain)
    : undefined;
  if (existing) {
    const updated: CustomerCandidate = {
      ...existing,
      name: input.candidateName || existing.name,
      metadata: { ...existing.metadata, ...metadata },
      updatedAt: now,
    };
    store.customers.set(updated.id, updated);
    upsertContactsAndInterests(store, updated.id, input);
    return updated;
  }

  const customer: CustomerCandidate = {
    id: store.nextId("customer"),
    name: input.candidateName || input.domain || "Unknown Customer",
    domain: input.domain,
    status: "candidate",
    userId: input.userId || DEFAULT_USER,
    metadata,
    createdAt: now,
    updatedAt: now,
  };
  store.customers.set(customer.id, customer);
  upsertContactsAndInterests(store, customer.id, input);
  return customer;
}

function upsertContactsAndInterests(
  store: ReturnType<typeof getLifecycleStore>,
  customerId: string,
  input: CreateCustomerOrPartnerCandidateInput,
): void {
  for (const contact of input.contacts || []) {
    const record = {
      id: store.nextId("contact"),
      name: contact.name || "Unknown",
      email: contact.email,
      phone: contact.phone,
      customerId,
      createdAt: new Date(),
    };
    store.contacts.set(record.id, record);
  }
  for (const interest of input.interests || []) {
    const record = {
      id: store.nextId("interest"),
      customerId,
      interest,
      sourceThreadKey: input.sourceThreadKey,
      confidence: input.confidence,
      createdAt: new Date(),
    };
    store.interests.set(record.id, record);
  }
  for (const pain of input.painPoints || []) {
    const record = {
      id: store.nextId("pain"),
      customerId,
      description: pain,
      sourceThreadKey: input.sourceThreadKey,
      createdAt: new Date(),
    };
    store.painPoints.set(record.id, record);
  }
}

export function createOpportunityFromMailThread(
  input: CreateOpportunityFromMailThreadInput,
): Opportunity {
  const store = getLifecycleStore();
  const now = new Date();
  const opportunity: Opportunity = {
    id: store.nextId("opp"),
    title: input.title,
    summary: input.summary,
    status: "open",
    customerId: input.customerId,
    partnerId: input.partnerId,
    sourceThreadKey: input.threadKey,
    interestedSolutions: input.interestedSolutions || [],
    painPoints: input.painPoints || [],
    messageIds: input.messageIds,
    requestedBy: input.requestedBy,
    createdAt: now,
    updatedAt: now,
  };
  store.opportunities.set(opportunity.id, opportunity);
  return opportunity;
}

export function promoteOpportunityToProposal(
  input: PromoteOpportunityToProposalInput,
): Proposal {
  const store = getLifecycleStore();
  const opportunity = store.opportunities.get(input.opportunityId);
  if (!opportunity) {
    throw new Error(`Opportunity not found: ${input.opportunityId}`);
  }
  if (opportunity.status === "lost" || opportunity.status === "archived") {
    throw new Error(
      `Invalid transition: opportunity status is ${opportunity.status}`,
    );
  }
  const now = new Date();
  const proposal: Proposal = {
    id: store.nextId("proposal"),
    opportunityId: input.opportunityId,
    status: "draft",
    estimateRequired: input.estimateRequired ?? true,
    pocRequired: input.pocRequired ?? false,
    requestedBy: input.requestedBy,
    createdAt: now,
    updatedAt: now,
  };
  store.proposals.set(proposal.id, proposal);
  store.opportunities.set(input.opportunityId, {
    ...opportunity,
    status: "proposal",
    updatedAt: now,
  });
  return proposal;
}

export function promoteProposalToProject(
  input: PromoteProposalToProjectInput,
): LifecycleProject {
  const store = getLifecycleStore();
  const proposal = store.proposals.get(input.proposalId);
  if (!proposal) {
    throw new Error(`Proposal not found: ${input.proposalId}`);
  }
  if (proposal.status === "sent") {
    // sent proposals can still promote
  } else if (proposal.status === "draft") {
    // allow draft → project for MVP
  }
  const opportunity = store.opportunities.get(proposal.opportunityId);
  const now = new Date();
  const project: LifecycleProject = {
    id: store.nextId("project"),
    name: input.projectName,
    description: input.description,
    status: "INTAKE",
    opportunityId: proposal.opportunityId,
    proposalId: proposal.id,
    metadata: {
      sourceOpportunityId: proposal.opportunityId,
      sourceThreadKey: opportunity?.sourceThreadKey,
    },
    userId: input.userId || DEFAULT_USER,
    createdAt: now,
    updatedAt: now,
  };
  store.projects.set(project.id, project);
  if (opportunity) {
    store.opportunities.set(opportunity.id, {
      ...opportunity,
      status: "won",
      updatedAt: now,
    });
  }
  return project;
}

export function createProjectDeliveryPackage(
  input: CreateProjectDeliveryPackageInput,
): {
  estimate?: Estimate;
  proposalDocument?: ProposalDocument;
  pocPlan?: POCPlan;
} {
  const store = getLifecycleStore();
  const project = store.projects.get(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }
  const now = new Date();
  const result: {
    estimate?: Estimate;
    proposalDocument?: ProposalDocument;
    pocPlan?: POCPlan;
  } = {};

  if (input.includeEstimate) {
    const estimate: Estimate = {
      id: store.nextId("estimate"),
      projectId: input.projectId,
      version: 1,
      status: "draft",
      lineItems: [{ label: "Initial estimate draft" }],
      requestedBy: input.requestedBy,
      createdAt: now,
      updatedAt: now,
    };
    store.estimates.set(estimate.id, estimate);
    result.estimate = estimate;
  }

  if (input.includeProposal) {
    const doc: ProposalDocument = {
      id: store.nextId("propdoc"),
      projectId: input.projectId,
      version: 1,
      status: "draft",
      title: `${project.name} Proposal`,
      sections: [
        {
          heading: "Executive Summary",
          body: "Draft generated from customer interests and pain points.",
        },
      ],
      requestedBy: input.requestedBy,
      createdAt: now,
      updatedAt: now,
    };
    store.proposalDocuments.set(doc.id, doc);
    result.proposalDocument = doc;
  }

  if (input.includePocPlan) {
    const poc: POCPlan = {
      id: store.nextId("poc"),
      projectId: input.projectId,
      status: "draft",
      scope: "POC scope draft",
      successCriteria: ["Validate core integration path"],
      requestedBy: input.requestedBy,
      createdAt: now,
      updatedAt: now,
    };
    store.pocPlans.set(poc.id, poc);
    result.pocPlan = poc;
  }

  return result;
}

export function completeProjectForCfoHandoff(
  input: CompleteProjectForCfoHandoffInput,
): ProjectCompletion {
  const store = getLifecycleStore();
  const project = store.projects.get(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }
  const proposalDocs = [...store.proposalDocuments.values()].filter(
    (d) => d.projectId === input.projectId,
  );
  const pocs = [...store.pocPlans.values()].filter(
    (p) => p.projectId === input.projectId,
  );
  const completion: ProjectCompletion = {
    id: store.nextId("completion"),
    projectId: input.projectId,
    completionSummary: input.completionSummary,
    finalEstimateId: input.estimateId,
    proposalDocumentIds: proposalDocs.map((d) => d.id),
    pocPlanIds: pocs.map((p) => p.id),
    approvalHistoryRefs: [],
    evidenceRefs: [],
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.completions.set(completion.id, completion);
  store.projects.set(input.projectId, {
    ...project,
    status: "COMPLETED",
    updatedAt: new Date(),
  });
  return completion;
}

export function requestCfoHandoff(
  input: RequestCfoHandoffInput,
  approved: boolean,
): CfoHandoff {
  const store = getLifecycleStore();
  const completion = store.completions.get(input.projectCompletionId);
  if (!completion) {
    throw new Error(
      `ProjectCompletion not found: ${input.projectCompletionId}`,
    );
  }
  const handoff: CfoHandoff = {
    id: store.nextId("cfo"),
    projectCompletionId: input.projectCompletionId,
    projectId: completion.projectId,
    status: approved ? "approved" : "pending_approval",
    summary: completion.completionSummary,
    finalEstimateId: completion.finalEstimateId,
    approvalId: input.approvalId,
    evidenceRefs: [`completion:${completion.id}`],
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.cfoHandoffs.set(handoff.id, handoff);
  return handoff;
}

export function createCustomerProductFromProject(input: {
  projectId: string;
  customerId: string;
  productName: string;
  version?: string;
  requestedBy: string;
}): CustomerProduct {
  const store = getLifecycleStore();
  const product: CustomerProduct = {
    id: store.nextId("product"),
    customerId: input.customerId,
    projectId: input.projectId,
    productName: input.productName,
    version: input.version,
    status: "draft",
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.customerProducts.set(product.id, product);
  return product;
}

export function createMaintenanceCase(input: {
  customerProductId: string;
  caseType: MaintenanceCase["caseType"];
  title: string;
  description?: string;
  mcpWorkflowRef?: string;
  sangforRouteRef?: string;
  requestedBy: string;
}): MaintenanceCase {
  const store = getLifecycleStore();
  const product = store.customerProducts.get(input.customerProductId);
  if (!product) {
    throw new Error(`CustomerProduct not found: ${input.customerProductId}`);
  }
  const maintenanceCase: MaintenanceCase = {
    id: store.nextId("maint"),
    customerProductId: input.customerProductId,
    caseType: input.caseType,
    title: input.title,
    description: input.description,
    status: "open",
    mcpWorkflowRef: input.mcpWorkflowRef,
    sangforRouteRef: input.sangforRouteRef,
    evidenceRefs: [],
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.maintenanceCases.set(maintenanceCase.id, maintenanceCase);
  return maintenanceCase;
}

export function createAgentTask(input: {
  type: AgentTaskType;
  targetRef: string;
  input?: Record<string, unknown>;
  requestedBy: string;
}): AgentTask {
  const store = getLifecycleStore();
  const now = new Date();
  const task: AgentTask = {
    id: store.nextId("agent"),
    type: input.type,
    status: "pending",
    targetRef: input.targetRef,
    input: input.input || {},
    requestedBy: input.requestedBy,
    createdAt: now,
    updatedAt: now,
  };
  store.agentTasks.set(task.id, task);
  return task;
}

export function startLifecycleWorkflowRun(input: {
  agentTaskId?: string;
  source: LifecycleWorkflowRun["source"];
  upstreamRef?: string;
  requestedBy: string;
  upstreamAvailable?: boolean;
}): LifecycleWorkflowRun {
  const store = getLifecycleStore();
  const now = new Date();
  const run: LifecycleWorkflowRun = {
    id: store.nextId("wfrun"),
    agentTaskId: input.agentTaskId,
    source: input.source,
    status: input.upstreamAvailable === false ? "failed" : "running",
    upstreamRef: input.upstreamRef,
    evidenceRefs: [],
    requestedBy: input.requestedBy,
    createdAt: now,
  };
  store.workflowRuns.set(run.id, run);

  if (input.agentTaskId) {
    const task = store.agentTasks.get(input.agentTaskId);
    if (task) {
      store.agentTasks.set(input.agentTaskId, {
        ...task,
        status: run.status,
        workflowRunId: run.id,
        updatedAt: now,
      });
    }
  }

  if (input.upstreamAvailable !== false) {
    store.workflowRuns.set(run.id, {
      ...run,
      status: "succeeded",
      completedAt: new Date(),
    });
    if (input.agentTaskId) {
      const task = store.agentTasks.get(input.agentTaskId);
      if (task) {
        store.agentTasks.set(input.agentTaskId, {
          ...task,
          status: "succeeded",
          workflowRunId: run.id,
          updatedAt: new Date(),
        });
      }
    }
  }

  return store.workflowRuns.get(run.id)!;
}

export function createImprovementTask(input: {
  title: string;
  description?: string;
  sourceType: ImprovementTask["sourceType"];
  sourceRef?: string;
  requestedBy: string;
}): ImprovementTask {
  const store = getLifecycleStore();
  const task: ImprovementTask = {
    id: store.nextId("improve"),
    title: input.title,
    description: input.description,
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    status: "backlog",
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.improvementTasks.set(task.id, task);
  return task;
}

export function linkImprovementToVibeProject(input: {
  improvementTaskId: string;
  vibeProjectRef: string;
  projectName: string;
  requestedBy: string;
}): DevProject {
  const store = getLifecycleStore();
  const improvement = store.improvementTasks.get(input.improvementTaskId);
  if (!improvement) {
    throw new Error(`ImprovementTask not found: ${input.improvementTaskId}`);
  }
  const devProject: DevProject = {
    id: store.nextId("devproj"),
    name: input.projectName,
    improvementTaskId: input.improvementTaskId,
    vibeProjectRef: input.vibeProjectRef,
    status: "active",
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.devProjects.set(devProject.id, devProject);
  store.improvementTasks.set(input.improvementTaskId, {
    ...improvement,
    vibeProjectId: devProject.id,
    status: "linked",
  });
  return devProject;
}

export function createSolutionCandidate(input: {
  title: string;
  description?: string;
  improvementTaskId?: string;
  requestedBy: string;
}): SolutionCandidate {
  const store = getLifecycleStore();
  const candidate: SolutionCandidate = {
    id: store.nextId("solution"),
    title: input.title,
    description: input.description,
    improvementTaskId: input.improvementTaskId,
    status: "idea",
    requestedBy: input.requestedBy,
    createdAt: new Date(),
  };
  store.solutionCandidates.set(candidate.id, candidate);
  return candidate;
}

export function parseMcpRagIndexSample(indexJson: {
  entries?: Array<Record<string, unknown>>;
}): KnowledgeIngestCandidate[] {
  const entries = indexJson.entries || [];
  return entries.slice(0, 50).map((entry, i) => ({
    sourceSystem: "mcp" as const,
    sourcePath: String(entry.path || "unknown"),
    sourceId: String(entry.id || `mcp-${i}`),
    title: String(entry.title || entry.path || `MCP doc ${i}`),
    contentSummary: String(entry.summary || entry.chunk || "").slice(0, 500),
    tags: Array.isArray(entry.tags) ? entry.tags.map(String) : ["mcp", "rag"],
  }));
}

export function parseVendorDbSample(vendorDb: {
  vendors?: Array<Record<string, unknown>>;
}): KnowledgeIngestCandidate[] {
  const vendors = vendorDb.vendors || [];
  return vendors.slice(0, 50).map((vendor, i) => ({
    sourceSystem: "mcp" as const,
    sourcePath: "data/vendors/vendor-database.json",
    sourceId: String(vendor.id || vendor.name || `vendor-${i}`),
    title: String(vendor.name || vendor.id || `Vendor ${i}`),
    contentSummary: String(vendor.description || vendor.category || "").slice(
      0,
      500,
    ),
    tags: ["vendor", "mcp"],
  }));
}

export function knowledgeIngestDryRun(input: {
  mcpRagIndex?: { entries?: Array<Record<string, unknown>> };
  vendorDb?: { vendors?: Array<Record<string, unknown>> };
}): { candidates: KnowledgeIngestCandidate[]; writeMode: false } {
  const candidates: KnowledgeIngestCandidate[] = [];
  if (input.mcpRagIndex) {
    candidates.push(...parseMcpRagIndexSample(input.mcpRagIndex));
  }
  if (input.vendorDb) {
    candidates.push(...parseVendorDbSample(input.vendorDb));
  }
  return { candidates, writeMode: false };
}

export function listLifecycleSummary() {
  const store = getLifecycleStore();
  return {
    customers: store.customers.size,
    partners: store.partners.size,
    opportunities: store.opportunities.size,
    proposals: store.proposals.size,
    projects: store.projects.size,
    completions: store.completions.size,
    customerProducts: store.customerProducts.size,
    maintenanceCases: store.maintenanceCases.size,
    agentTasks: store.agentTasks.size,
    improvementTasks: store.improvementTasks.size,
  };
}
