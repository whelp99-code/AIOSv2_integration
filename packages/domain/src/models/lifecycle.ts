/**
 * Lifecycle domain models — Mail → CRM → Opportunity → Project → Delivery → Maintenance
 */

export type EntityRole = "customer" | "partner";

export type CandidateStatus = "candidate" | "active";

export type OpportunityStatus =
  | "open"
  | "qualified"
  | "proposal"
  | "won"
  | "lost"
  | "archived";

export type ProposalStatus =
  | "draft"
  | "in_review"
  | "ready_for_approval"
  | "approved"
  | "sent";

export type DeliveryArtifactStatus =
  | "draft"
  | "readyForApproval"
  | "approved"
  | "sent"
  | "completed";

export type AgentTaskStatus = "pending" | "running" | "succeeded" | "failed";

export type AgentTaskType =
  | "mail-reply"
  | "entity-resolution"
  | "opportunity-scoring"
  | "proposal-writing"
  | "poc-planning"
  | "maintenance-triage";

export interface SourceMailMetadata {
  sourceThreadKey: string;
  sampleSubjects?: string[];
  confidence?: number;
  requestedBy: string;
  messageIds?: string[];
}

export interface CustomerInterest {
  id: string;
  customerId: string;
  interest: string;
  solution?: string;
  sourceThreadKey?: string;
  confidence?: number;
  createdAt: Date;
}

export interface PainPoint {
  id: string;
  customerId: string;
  description: string;
  impact?: string;
  sourceThreadKey?: string;
  relatedProjectId?: string;
  createdAt: Date;
}

export interface CustomerCandidate {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  status: CandidateStatus;
  userId: string;
  metadata: SourceMailMetadata & {
    interests?: string[];
    solutions?: string[];
    painPoints?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerCandidate {
  id: string;
  name: string;
  domain?: string;
  type?: string;
  status: CandidateStatus;
  userId: string;
  metadata: SourceMailMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactRecord {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  customerId?: string;
  partnerId?: string;
  createdAt: Date;
}

export interface Opportunity {
  id: string;
  title: string;
  summary?: string;
  status: OpportunityStatus;
  customerId?: string;
  partnerId?: string;
  sourceThreadKey: string;
  interestedSolutions: string[];
  painPoints: string[];
  messageIds: string[];
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Proposal {
  id: string;
  opportunityId: string;
  status: ProposalStatus;
  estimateRequired: boolean;
  pocRequired: boolean;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleProject {
  id: string;
  name: string;
  description?: string;
  status:
    | "INTAKE"
    | "PLANNING"
    | "IN_PROGRESS"
    | "REVIEW"
    | "COMPLETED"
    | "ARCHIVED";
  opportunityId?: string;
  proposalId?: string;
  metadata: Record<string, unknown>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Estimate {
  id: string;
  projectId: string;
  version: number;
  status: DeliveryArtifactStatus;
  amount?: number;
  currency?: string;
  lineItems: Array<{ label: string; amount?: number }>;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalDocument {
  id: string;
  projectId: string;
  version: number;
  status: DeliveryArtifactStatus;
  title: string;
  sections: Array<{ heading: string; body: string }>;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface POCPlan {
  id: string;
  projectId: string;
  status: DeliveryArtifactStatus;
  scope: string;
  schedule?: string;
  owner?: string;
  successCriteria: string[];
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCompletion {
  id: string;
  projectId: string;
  completionSummary: string;
  finalEstimateId?: string;
  proposalDocumentIds: string[];
  pocPlanIds: string[];
  approvalHistoryRefs: string[];
  evidenceRefs: string[];
  requestedBy: string;
  createdAt: Date;
}

export interface CfoHandoff {
  id: string;
  projectCompletionId: string;
  projectId: string;
  status: "draft" | "pending_approval" | "approved" | "sent";
  summary: string;
  finalEstimateId?: string;
  approvalId?: string;
  evidenceRefs: string[];
  requestedBy: string;
  createdAt: Date;
}

export interface CustomerProduct {
  id: string;
  customerId: string;
  projectId?: string;
  productName: string;
  version?: string;
  contractInfo?: string;
  maintenanceInfo?: string;
  status: "draft" | "active";
  requestedBy: string;
  createdAt: Date;
}

export interface MaintenanceCase {
  id: string;
  customerProductId: string;
  caseType: "support" | "inspection" | "incident" | "change";
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  mcpWorkflowRef?: string;
  sangforRouteRef?: string;
  evidenceRefs: string[];
  requestedBy: string;
  createdAt: Date;
}

export interface MaintenanceSchedule {
  id: string;
  customerProductId: string;
  scheduleType: string;
  nextDueAt?: string;
  owner?: string;
  createdAt: Date;
}

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  targetRef: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  workflowRunId?: string;
  error?: string;
  requestedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleWorkflowRun {
  id: string;
  agentTaskId?: string;
  source: "f-aios-v3" | "mcp-workflow" | "vibe-coding" | "local";
  status: AgentTaskStatus;
  upstreamRef?: string;
  evidenceRefs: string[];
  requestedBy: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ImprovementTask {
  id: string;
  title: string;
  description?: string;
  sourceType: "lifecycle" | "maintenance" | "manual";
  sourceRef?: string;
  vibeProjectId?: string;
  status: "backlog" | "linked" | "in_progress" | "done";
  requestedBy: string;
  createdAt: Date;
}

export interface DevProject {
  id: string;
  name: string;
  improvementTaskId?: string;
  vibeProjectRef?: string;
  status: "draft" | "active" | "completed";
  requestedBy: string;
  createdAt: Date;
}

export interface SolutionCandidate {
  id: string;
  title: string;
  description?: string;
  improvementTaskId?: string;
  status: "idea" | "evaluating" | "approved" | "rejected";
  requestedBy: string;
  createdAt: Date;
}

export interface KnowledgeIngestCandidate {
  sourceSystem: "mail" | "mcp" | "vibe";
  sourcePath: string;
  sourceId: string;
  title: string;
  contentSummary: string;
  tags: string[];
}

export interface CreateCustomerOrPartnerCandidateInput {
  entityRole: EntityRole;
  domain?: string;
  candidateName?: string;
  contacts?: Array<{ name?: string; email?: string; phone?: string }>;
  interests?: string[];
  solutions?: string[];
  painPoints?: string[];
  sourceThreadKey: string;
  sampleSubjects?: string[];
  confidence?: number;
  requestedBy: string;
  userId?: string;
}

export interface CreateOpportunityFromMailThreadInput {
  customerId?: string;
  partnerId?: string;
  threadKey: string;
  title: string;
  summary?: string;
  interestedSolutions?: string[];
  painPoints?: string[];
  messageIds: string[];
  requestedBy: string;
}

export interface PromoteOpportunityToProposalInput {
  opportunityId: string;
  estimateRequired?: boolean;
  pocRequired?: boolean;
  requestedBy: string;
}

export interface PromoteProposalToProjectInput {
  proposalId: string;
  projectName: string;
  description?: string;
  requestedBy: string;
  userId?: string;
}

export interface CreateProjectDeliveryPackageInput {
  projectId: string;
  includeEstimate: boolean;
  includeProposal: boolean;
  includePocPlan: boolean;
  requestedBy: string;
}

export interface CompleteProjectForCfoHandoffInput {
  projectId: string;
  estimateId?: string;
  completionSummary: string;
  requestedBy: string;
}

export interface RequestCfoHandoffInput {
  projectCompletionId: string;
  approvalId?: string;
  requestedBy: string;
}
