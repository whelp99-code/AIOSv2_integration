/**
 * In-memory lifecycle store — MVP without DB migration.
 */

import type {
  AgentTask,
  CfoHandoff,
  ContactRecord,
  CustomerCandidate,
  CustomerInterest,
  CustomerProduct,
  DevProject,
  Estimate,
  ImprovementTask,
  LifecycleProject,
  LifecycleWorkflowRun,
  MaintenanceCase,
  MaintenanceSchedule,
  Opportunity,
  POCPlan,
  PainPoint,
  PartnerCandidate,
  ProjectCompletion,
  Proposal,
  ProposalDocument,
  SolutionCandidate,
} from "@aios/domain";

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class LifecycleStore {
  customers = new Map<string, CustomerCandidate>();
  partners = new Map<string, PartnerCandidate>();
  contacts = new Map<string, ContactRecord>();
  interests = new Map<string, CustomerInterest>();
  painPoints = new Map<string, PainPoint>();
  opportunities = new Map<string, Opportunity>();
  proposals = new Map<string, Proposal>();
  projects = new Map<string, LifecycleProject>();
  estimates = new Map<string, Estimate>();
  proposalDocuments = new Map<string, ProposalDocument>();
  pocPlans = new Map<string, POCPlan>();
  completions = new Map<string, ProjectCompletion>();
  cfoHandoffs = new Map<string, CfoHandoff>();
  customerProducts = new Map<string, CustomerProduct>();
  maintenanceCases = new Map<string, MaintenanceCase>();
  maintenanceSchedules = new Map<string, MaintenanceSchedule>();
  agentTasks = new Map<string, AgentTask>();
  workflowRuns = new Map<string, LifecycleWorkflowRun>();
  improvementTasks = new Map<string, ImprovementTask>();
  devProjects = new Map<string, DevProject>();
  solutionCandidates = new Map<string, SolutionCandidate>();

  nextId(prefix: string): string {
    return id(prefix);
  }

  findCustomerByDomain(domain: string): CustomerCandidate | undefined {
    const normalized = domain.toLowerCase();
    return [...this.customers.values()].find(
      (c) => c.domain?.toLowerCase() === normalized,
    );
  }

  findPartnerByDomain(domain: string): PartnerCandidate | undefined {
    const normalized = domain.toLowerCase();
    return [...this.partners.values()].find(
      (p) => p.domain?.toLowerCase() === normalized,
    );
  }

  reset(): void {
    this.customers.clear();
    this.partners.clear();
    this.contacts.clear();
    this.interests.clear();
    this.painPoints.clear();
    this.opportunities.clear();
    this.proposals.clear();
    this.projects.clear();
    this.estimates.clear();
    this.proposalDocuments.clear();
    this.pocPlans.clear();
    this.completions.clear();
    this.cfoHandoffs.clear();
    this.customerProducts.clear();
    this.maintenanceCases.clear();
    this.maintenanceSchedules.clear();
    this.agentTasks.clear();
    this.workflowRuns.clear();
    this.improvementTasks.clear();
    this.devProjects.clear();
    this.solutionCandidates.clear();
  }
}

let globalStore: LifecycleStore | null = null;

export function getLifecycleStore(): LifecycleStore {
  if (!globalStore) {
    globalStore = new LifecycleStore();
  }
  return globalStore;
}

export function resetLifecycleStore(): void {
  if (globalStore) {
    globalStore.reset();
  }
}
