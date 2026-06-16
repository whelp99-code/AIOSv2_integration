/**
 * Lifecycle workflow unit tests — C2 through C9
 */
import { beforeEach, describe, expect, it } from "vitest";
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
  knowledgeIngestDryRun,
  linkImprovementToVibeProject,
  promoteOpportunityToProposal,
  promoteProposalToProject,
  requestCfoHandoff,
  startLifecycleWorkflowRun,
} from "@aios/application";
import { getLifecycleStore, resetLifecycleStore } from "@aios/application";

describe("lifecycle C2 — customer/partner candidates", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates customer candidate with candidate status", () => {
    const customer = createCustomerOrPartnerCandidateFromMail({
      entityRole: "customer",
      domain: "acme.example",
      candidateName: "Acme Corp",
      sourceThreadKey: "thread-1",
      requestedBy: "test",
    });
    expect(customer.status).toBe("candidate");
    expect(customer.domain).toBe("acme.example");
  });

  it("upserts duplicate domain without activating", () => {
    createCustomerOrPartnerCandidateFromMail({
      entityRole: "customer",
      domain: "acme.example",
      candidateName: "Acme",
      sourceThreadKey: "thread-1",
      requestedBy: "test",
    });
    const updated = createCustomerOrPartnerCandidateFromMail({
      entityRole: "customer",
      domain: "acme.example",
      candidateName: "Acme Updated",
      sourceThreadKey: "thread-2",
      sampleSubjects: ["Follow up"],
      confidence: 0.9,
      requestedBy: "test",
    });
    expect(updated.status).toBe("candidate");
    expect(updated.name).toBe("Acme Updated");
    expect("metadata" in updated && updated.metadata.sourceThreadKey).toBe(
      "thread-2",
    );
    expect(getLifecycleStore().customers.size).toBe(1);
  });

  it("preserves source metadata", () => {
    const customer = createCustomerOrPartnerCandidateFromMail({
      entityRole: "customer",
      domain: "beta.example",
      sourceThreadKey: "thread-x",
      sampleSubjects: ["Quote request"],
      confidence: 0.85,
      painPoints: ["Legacy infra"],
      requestedBy: "mail-hub",
    });
    expect(customer.metadata.sourceThreadKey).toBe("thread-x");
    expect(customer.metadata.sampleSubjects).toContain("Quote request");
    expect(customer.metadata.confidence).toBe(0.85);
  });
});

describe("lifecycle C3 — opportunity / proposal / project", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates opportunity from mail thread", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "New deal",
      messageIds: ["m1"],
      interestedSolutions: ["HCI"],
      requestedBy: "test",
    });
    expect(opp.status).toBe("open");
    expect(opp.sourceThreadKey).toBe("t1");
  });

  it("promotes opportunity to proposal", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "Deal",
      messageIds: ["m1"],
      requestedBy: "test",
    });
    const proposal = promoteOpportunityToProposal({
      opportunityId: opp.id,
      estimateRequired: true,
      requestedBy: "test",
    });
    expect(proposal.opportunityId).toBe(opp.id);
    expect(proposal.status).toBe("draft");
  });

  it("promotes proposal to project", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "Deal",
      messageIds: ["m1"],
      requestedBy: "test",
    });
    const proposal = promoteOpportunityToProposal({
      opportunityId: opp.id,
      requestedBy: "test",
    });
    const project = promoteProposalToProject({
      proposalId: proposal.id,
      projectName: "Acme HCI Project",
      requestedBy: "test",
    });
    expect(project.status).toBe("INTAKE");
    expect(project.proposalId).toBe(proposal.id);
  });

  it("rejects invalid opportunity transition", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "Lost deal",
      messageIds: ["m1"],
      requestedBy: "test",
    });
    const store = getLifecycleStore();
    store.opportunities.set(opp.id, { ...opp, status: "lost" });
    expect(() =>
      promoteOpportunityToProposal({
        opportunityId: opp.id,
        requestedBy: "test",
      }),
    ).toThrow(/Invalid transition/);
  });
});

describe("lifecycle C4 — delivery artifacts", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates estimate, proposal, and POC drafts", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "Deal",
      messageIds: ["m1"],
      requestedBy: "test",
    });
    const proposal = promoteOpportunityToProposal({
      opportunityId: opp.id,
      requestedBy: "test",
    });
    const project = promoteProposalToProject({
      proposalId: proposal.id,
      projectName: "Project",
      requestedBy: "test",
    });
    const delivery = createProjectDeliveryPackage({
      projectId: project.id,
      includeEstimate: true,
      includeProposal: true,
      includePocPlan: true,
      requestedBy: "test",
    });
    expect(delivery.estimate?.status).toBe("draft");
    expect(delivery.proposalDocument?.status).toBe("draft");
    expect(delivery.pocPlan?.status).toBe("draft");
  });
});

describe("lifecycle C5 — completion and CFO handoff", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates completion package", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "Deal",
      messageIds: ["m1"],
      requestedBy: "test",
    });
    const proposal = promoteOpportunityToProposal({
      opportunityId: opp.id,
      requestedBy: "test",
    });
    const project = promoteProposalToProject({
      proposalId: proposal.id,
      projectName: "Project",
      requestedBy: "test",
    });
    const delivery = createProjectDeliveryPackage({
      projectId: project.id,
      includeEstimate: true,
      includeProposal: false,
      includePocPlan: false,
      requestedBy: "test",
    });
    const completion = completeProjectForCfoHandoff({
      projectId: project.id,
      estimateId: delivery.estimate?.id,
      completionSummary: "Done",
      requestedBy: "test",
    });
    expect(completion.projectId).toBe(project.id);
    expect(completion.finalEstimateId).toBe(delivery.estimate?.id);
  });

  it("CFO handoff without approval stays pending", () => {
    const opp = createOpportunityFromMailThread({
      threadKey: "t1",
      title: "Deal",
      messageIds: ["m1"],
      requestedBy: "test",
    });
    const proposal = promoteOpportunityToProposal({
      opportunityId: opp.id,
      requestedBy: "test",
    });
    const project = promoteProposalToProject({
      proposalId: proposal.id,
      projectName: "Project",
      requestedBy: "test",
    });
    const completion = completeProjectForCfoHandoff({
      projectId: project.id,
      completionSummary: "test",
      requestedBy: "test",
    });
    const handoff = requestCfoHandoff(
      {
        projectCompletionId: completion.id,
        requestedBy: "test",
      },
      false,
    );
    expect(handoff.status).toBe("pending_approval");
    expect(handoff.evidenceRefs.length).toBeGreaterThan(0);
  });
});

describe("lifecycle C6 — customer product and maintenance", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates customer product from project", () => {
    const customer = createCustomerOrPartnerCandidateFromMail({
      entityRole: "customer",
      domain: "acme.example",
      sourceThreadKey: "t1",
      requestedBy: "test",
    });
    const product = createCustomerProductFromProject({
      projectId: "proj-1",
      customerId: customer.id,
      productName: "HCI Cluster",
      requestedBy: "test",
    });
    expect(product.status).toBe("draft");
  });

  it("links maintenance case to customer product", () => {
    const customer = createCustomerOrPartnerCandidateFromMail({
      entityRole: "customer",
      domain: "acme.example",
      sourceThreadKey: "t1",
      requestedBy: "test",
    });
    const product = createCustomerProductFromProject({
      projectId: "proj-1",
      customerId: customer.id,
      productName: "HCI",
      requestedBy: "test",
    });
    const maint = createMaintenanceCase({
      customerProductId: product.id,
      caseType: "incident",
      title: "Node down",
      mcpWorkflowRef: "mcp://workflow/123",
      requestedBy: "test",
    });
    expect(maint.customerProductId).toBe(product.id);
    expect(maint.status).toBe("open");
  });
});

describe("lifecycle C7 — agent orchestration", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates agent task and workflow run", () => {
    const task = createAgentTask({
      type: "mail-reply",
      targetRef: "msg-1",
      requestedBy: "test",
    });
    expect(task.status).toBe("pending");
    const run = startLifecycleWorkflowRun({
      agentTaskId: task.id,
      source: "f-aios-v3",
      requestedBy: "test",
      upstreamAvailable: true,
    });
    expect(run.status).toBe("succeeded");
  });

  it("degraded upstream without data loss", () => {
    const task = createAgentTask({
      type: "entity-resolution",
      targetRef: "entity-1",
      requestedBy: "test",
    });
    const run = startLifecycleWorkflowRun({
      agentTaskId: task.id,
      source: "f-aios-v3",
      requestedBy: "test",
      upstreamAvailable: false,
    });
    expect(run.status).toBe("failed");
    expect(getLifecycleStore().agentTasks.get(task.id)?.targetRef).toBe(
      "entity-1",
    );
  });
});

describe("lifecycle C8 — improvement and vibe", () => {
  beforeEach(() => resetLifecycleStore());

  it("creates improvement task and links vibe project", () => {
    const task = createImprovementTask({
      title: "Add mail hub filter",
      sourceType: "maintenance",
      requestedBy: "test",
    });
    const dev = linkImprovementToVibeProject({
      improvementTaskId: task.id,
      vibeProjectRef: "vibe://project/1",
      projectName: "Mail filter",
      requestedBy: "test",
    });
    expect(dev.vibeProjectRef).toBe("vibe://project/1");
  });

  it("tracks solution candidate", () => {
    const candidate = createSolutionCandidate({
      title: "Auto POC scheduler",
      requestedBy: "test",
    });
    expect(candidate.status).toBe("idea");
  });
});

describe("lifecycle C9 — knowledge ingest dry-run", () => {
  it("parses MCP RAG index sample", () => {
    const result = knowledgeIngestDryRun({
      mcpRagIndex: {
        entries: [
          {
            id: "doc-1",
            path: "/rag/hci.md",
            title: "HCI Guide",
            summary: "Overview",
          },
        ],
      },
    });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].sourceSystem).toBe("mcp");
    expect(result.candidates[0].sourcePath).toBe("/rag/hci.md");
  });

  it("parses vendor DB sample", () => {
    const result = knowledgeIngestDryRun({
      vendorDb: {
        vendors: [{ id: "v1", name: "Sangfor", description: "HCI vendor" }],
      },
    });
    expect(result.candidates[0].title).toBe("Sangfor");
    expect(result.candidates[0].tags).toContain("vendor");
  });
});
