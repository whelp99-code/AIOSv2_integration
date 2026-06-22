-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "IngestionSourceType" AS ENUM ('OUTLOOK_MAIL', 'CALL_AUDIO', 'MEETING_TRANSCRIPT');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('RECEIVED', 'NORMALIZED', 'EXTRACTED', 'READY_FOR_REVIEW', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "IngestionJobStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IngestionMailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "IngestionMailCategory" AS ENUM ('TECH_QUESTION', 'QUOTE_REQUEST', 'FOLLOW_UP', 'MEETING_FOLLOW_UP', 'INTERNAL_NOTE');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'PROSPECT', 'PARTNER', 'HOLD', 'LOST');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('NEW_LEAD', 'QUALIFICATION', 'TECH_REVIEW', 'PROPOSAL', 'POC', 'NEGOTIATION', 'WON', 'LOST', 'HOLD');

-- CreateEnum
CREATE TYPE "OpportunityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProductFamily" AS ENUM ('HCI', 'HDR', 'SCP', 'SKE', 'SASE', 'NGAF', 'IAG', 'EPP', 'NETWORK', 'BACKUP', 'VDI', 'OTHER');

-- CreateEnum
CREATE TYPE "MailItemType" AS ENUM ('CUSTOMER_REQUEST', 'TECH_QUESTION', 'QUOTE_REQUEST', 'SCHEDULE_REQUEST', 'PARTNER_REQUEST', 'SUPPORT_ISSUE', 'INTERNAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MailActionStatus" AS ENUM ('UNCLASSIFIED', 'LINKED', 'REPLY_DRAFTED', 'WAITING_APPROVAL', 'SENT', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'NEEDS_VENDOR_CHECK', 'CUSTOMER_REPLY_READY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FeasibilityStatus" AS ENUM ('POSSIBLE', 'NOT_POSSIBLE', 'NEEDS_CONFIRMATION');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'INTERNAL_REVIEW', 'WAITING_APPROVAL', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ERROR');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('MANUAL', 'SCHEDULE', 'WEBHOOK', 'EMAIL', 'CALENDAR', 'PROJECT_STATUS_CHANGE', 'SHEET_CHANGE');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'WAITING_APPROVAL', 'CANCELED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('SEND_EMAIL', 'SEND_MESSAGE', 'UPDATE', 'DELETE', 'PUBLISH', 'MOVE', 'COST_ACTION', 'SEND_QUOTE', 'EXTERNAL_SHARE');

-- CreateEnum
CREATE TYPE "ConnectionProvider" AS ENUM ('SLACK', 'NOTION', 'GOOGLE_SHEETS', 'GMAIL', 'OUTLOOK', 'GOOGLE_CALENDAR', 'OUTLOOK_CALENDAR', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'ERROR', 'NOT_CONNECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SOP', 'BRAND_GUIDE', 'FAQ', 'PRODUCT_DOC', 'REPORT', 'PROPOSAL', 'QUOTE', 'MEETING_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "defaultSignature" TEXT,
    "mailStyleGuide" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "industry" TEXT,
    "sizeLabel" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "currentInfra" JSONB,
    "productFit" "ProductFamily"[],
    "opportunity" "OpportunityLevel" NOT NULL DEFAULT 'MEDIUM',
    "nextAction" TEXT,
    "nextActionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "productFamily" "ProductFamily"[],
    "status" "ProjectStatus" NOT NULL DEFAULT 'NEW_LEAD',
    "opportunity" "OpportunityLevel" NOT NULL DEFAULT 'MEDIUM',
    "expectedRevenue" DECIMAL(65,30),
    "dueAt" TIMESTAMP(3),
    "summary" TEXT,
    "nextAction" TEXT,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT,
    "rawText" TEXT NOT NULL,
    "extracted" JSONB,
    "requiredAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "projectId" TEXT,
    "provider" "ConnectionProvider" NOT NULL,
    "externalMessageId" TEXT,
    "threadKey" TEXT,
    "fromEmail" TEXT,
    "fromName" TEXT,
    "toEmails" TEXT[],
    "subject" TEXT,
    "snippet" TEXT,
    "bodyText" TEXT,
    "receivedAt" TIMESTAMP(3),
    "type" "MailItemType" NOT NULL DEFAULT 'UNKNOWN',
    "actionStatus" "MailActionStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
    "urgencyScore" INTEGER,
    "extracted" JSONB,
    "replyDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceType" "IngestionSourceType" NOT NULL,
    "provider" "ConnectionProvider",
    "label" TEXT NOT NULL,
    "cursor" TEXT,
    "syncMode" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" "IngestionSourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "projectName" TEXT,
    "status" "IngestionStatus" NOT NULL DEFAULT 'RECEIVED',
    "approvalStatus" "IngestionApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "priority" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "participants" JSONB,
    "attachments" JSONB,
    "rawContent" TEXT NOT NULL,
    "normalizedContent" TEXT NOT NULL,
    "extractedRequest" TEXT NOT NULL,
    "suggestedReply" TEXT NOT NULL,
    "actionItems" JSONB,
    "decisions" JSONB,
    "transcriptText" TEXT,
    "transcriptSegments" JSONB,
    "audioUrl" TEXT,
    "mailDirection" "IngestionMailDirection",
    "mailCategory" "IngestionMailCategory",
    "relatedMailItemId" TEXT,
    "relatedRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" "IngestionSourceType" NOT NULL,
    "mode" TEXT NOT NULL,
    "status" "IngestionJobStatus" NOT NULL DEFAULT 'RUNNING',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresalesReview" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "productFamily" "ProductFamily"[],
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "feasibility" "FeasibilityStatus" NOT NULL DEFAULT 'NEEDS_CONFIRMATION',
    "requestSummary" TEXT,
    "missingInfo" JSONB,
    "checklist" JSONB,
    "internalNotes" TEXT,
    "customerReplyDraft" TEXT,
    "vendorQuestionDraft" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PresalesReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "productFamily" "ProductFamily"[],
    "bom" JSONB,
    "amount" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "customerSummary" TEXT,
    "partnerRequestDraft" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "roleTitle" TEXT,
    "description" TEXT,
    "personaPrompt" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'DRAFT',
    "goals" JSONB,
    "allowedTools" TEXT[],
    "blockedActions" TEXT[],
    "outputFormats" TEXT[],
    "approvalPolicy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "triggerType" "TriggerType" NOT NULL,
    "triggerConfig" JSONB,
    "steps" JSONB,
    "approvalRule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "workflowId" TEXT,
    "agentId" TEXT,
    "projectId" TEXT,
    "mailItemId" TEXT,
    "startedById" TEXT,
    "title" TEXT NOT NULL,
    "input" JSONB,
    "plan" JSONB,
    "output" JSONB,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "RunStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "runId" TEXT,
    "projectId" TEXT,
    "proposalId" TEXT,
    "requestedById" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "actionType" "ApprovalActionType" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "destination" TEXT,
    "preview" JSONB,
    "warning" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "ConnectionProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "accountLabel" TEXT,
    "scopes" TEXT[],
    "metadata" JSONB,
    "connectedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "content" TEXT,
    "sourceUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "expectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "integration_health" (
    "id" TEXT NOT NULL,
    "service_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "last_checked_at" TIMESTAMP(3),
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_projects" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_project_members" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workspaces" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_profiles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_values" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commands" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_runs" (
    "id" TEXT NOT NULL,
    "command_id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "requested_by_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input_summary" TEXT,
    "source_entity_type" TEXT,
    "source_entity_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "command_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "improvement_candidates" (
    "id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "suggested_module" TEXT,
    "suggested_action" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "command_run_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "improvement_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflows" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflow_steps" (
    "id" TEXT NOT NULL,
    "automation_workflow_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_assignments" (
    "id" TEXT NOT NULL,
    "automation_workflow_step_id" TEXT NOT NULL,
    "agent_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_calls" (
    "id" TEXT NOT NULL,
    "agent_assignment_id" TEXT NOT NULL,
    "tool_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_results" (
    "id" TEXT NOT NULL,
    "automation_workflow_step_id" TEXT NOT NULL,
    "check_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_reports" (
    "id" TEXT NOT NULL,
    "validation_result_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body_markdown" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_analyses" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "intent_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_analyses" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "risk_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "agent_assignment_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_decision_logs" (
    "id" TEXT NOT NULL,
    "agent_assignment_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_approval_requests" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "pull_request_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "remote_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "head_sha" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "url" TEXT,
    "ci_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_changes" (
    "id" TEXT NOT NULL,
    "pull_request_id" TEXT,
    "command_run_id" TEXT,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_runs" (
    "id" TEXT NOT NULL,
    "code_change_id" TEXT,
    "command_run_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "log_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_runs" (
    "id" TEXT NOT NULL,
    "build_run_id" TEXT,
    "command_run_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changed_files" (
    "id" TEXT NOT NULL,
    "code_change_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "change_type" TEXT NOT NULL,

    CONSTRAINT "changed_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_registry" (
    "id" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '0.1.0',
    "dependency_json" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "block_registry" (
    "id" TEXT NOT NULL,
    "block_key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "config_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_slots" (
    "id" TEXT NOT NULL,
    "page_key" TEXT NOT NULL,
    "slot_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "block_registry_id" TEXT,

    CONSTRAINT "layout_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_registry" (
    "id" TEXT NOT NULL,
    "node_key" TEXT NOT NULL,
    "module_key" TEXT NOT NULL,
    "node_type" TEXT NOT NULL,
    "config_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_registry" (
    "id" TEXT NOT NULL,
    "query_key" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state_transition_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_type" TEXT,
    "actor_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "state_transition_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_plans" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_checks" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "check_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "validation_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_gates" (
    "id" TEXT NOT NULL,
    "gate_key" TEXT NOT NULL,
    "required_checks" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_events" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "source" TEXT NOT NULL,
    "amount_usd" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_mail_accounts" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'outlook',
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'mock',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_mail_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_mail_messages" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "body_preview" TEXT,
    "group_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_mail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_portal_tasks" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "source" TEXT NOT NULL DEFAULT 'portal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_portal_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_knowledge_documents" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_derived_candidates" (
    "id" TEXT NOT NULL,
    "automation_knowledge_document_id" TEXT,
    "candidate_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "source_title" TEXT,
    "source_sender" TEXT,
    "source_received_at" TIMESTAMP(3),
    "confidence" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "created_entity_type" TEXT,
    "created_entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "mail_insight_thread_id" TEXT,

    CONSTRAINT "mail_derived_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runtime_policies" (
    "id" TEXT NOT NULL,
    "policy_key" TEXT NOT NULL,
    "config_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runtime_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connector_registry" (
    "id" TEXT NOT NULL,
    "connector_key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "connector_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connector_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codex_tasks" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "github_issue_id" TEXT,
    "pull_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codex_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codex_task_logs" (
    "id" TEXT NOT NULL,
    "codex_task_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codex_task_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursor_sessions" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "branch_name" TEXT NOT NULL,
    "task_summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "build_status" TEXT,
    "test_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "cursor_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_issues" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "codex_task_id" TEXT,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "github_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_timeline_items" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_timeline_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "event_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_policies" (
    "id" TEXT NOT NULL,
    "policy_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_items" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_threads" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_calls" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canvases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_catalog_items" (
    "id" TEXT NOT NULL,
    "skill_key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "plugin" TEXT,
    "phases_json" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "usage" TEXT,
    "agent_usage_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_runs" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "skill_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "execution_mode" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "raw_output_json" JSONB,
    "normalized_output_json" JSONB,
    "normalize_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_breakdown_items" (
    "id" TEXT NOT NULL,
    "command_run_id" TEXT,
    "skill_run_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "target_area" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL DEFAULT 'low',
    "estimated_hours" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "acceptance_criteria" JSONB,
    "test_criteria" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_breakdown_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_assignment_rules" (
    "id" TEXT NOT NULL,
    "rule_key" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_assignment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_insight_threads" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "thread_key" TEXT NOT NULL,
    "thread_title" TEXT NOT NULL,
    "source_provider" TEXT NOT NULL DEFAULT 'mail-intelligence',
    "account_id" TEXT,
    "account_email" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "message_ids" JSONB,
    "latest_received_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'reference',
    "effective_status" TEXT,
    "ai_enhanced" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "next_actions" JSONB,
    "evidence_items" JSONB,
    "revenue_ops_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "participant_domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "automation_knowledge_document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mail_insight_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_memories" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "memory_type" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value_json" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_decision_logs" (
    "id" TEXT NOT NULL,
    "automation_project_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "decision_type" TEXT NOT NULL,
    "input_json" JSONB,
    "output_json" JSONB,
    "policy_version" TEXT NOT NULL DEFAULT 'mail-policy-v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Project_organizationId_status_idx" ON "Project"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionSource_organizationId_sourceType_key" ON "IngestionSource"("organizationId", "sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionItem_organizationId_sourceType_externalId_key" ON "IngestionItem"("organizationId", "sourceType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolConnection_organizationId_provider_key" ON "ToolConnection"("organizationId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "integration_health_service_key_key" ON "integration_health"("service_key");

-- CreateIndex
CREATE UNIQUE INDEX "automation_projects_slug_key" ON "automation_projects"("slug");

-- CreateIndex
CREATE INDEX "automation_projects_organization_id_idx" ON "automation_projects"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "automation_project_members_automation_project_id_user_id_key" ON "automation_project_members"("automation_project_id", "user_id");

-- CreateIndex
CREATE INDEX "automation_workspaces_automation_project_id_idx" ON "automation_workspaces"("automation_project_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_profiles_key_key" ON "config_profiles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "config_values_profile_id_key_key" ON "config_values"("profile_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "commands_key_key" ON "commands"("key");

-- CreateIndex
CREATE INDEX "command_runs_automation_project_id_status_idx" ON "command_runs"("automation_project_id", "status");

-- CreateIndex
CREATE INDEX "command_runs_command_id_idx" ON "command_runs"("command_id");

-- CreateIndex
CREATE INDEX "command_runs_source_entity_type_source_entity_id_idx" ON "command_runs"("source_entity_type", "source_entity_id");

-- CreateIndex
CREATE INDEX "improvement_candidates_status_created_at_idx" ON "improvement_candidates"("status", "created_at");

-- CreateIndex
CREATE INDEX "automation_workflows_command_run_id_idx" ON "automation_workflows"("command_run_id");

-- CreateIndex
CREATE INDEX "automation_workflow_steps_automation_workflow_id_sort_order_idx" ON "automation_workflow_steps"("automation_workflow_id", "sort_order");

-- CreateIndex
CREATE INDEX "agent_assignments_automation_workflow_step_id_idx" ON "agent_assignments"("automation_workflow_step_id");

-- CreateIndex
CREATE INDEX "tool_calls_agent_assignment_id_idx" ON "tool_calls"("agent_assignment_id");

-- CreateIndex
CREATE INDEX "validation_results_automation_workflow_step_id_idx" ON "validation_results"("automation_workflow_step_id");

-- CreateIndex
CREATE UNIQUE INDEX "intent_analyses_command_run_id_key" ON "intent_analyses"("command_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_analyses_command_run_id_key" ON "risk_analyses"("command_run_id");

-- CreateIndex
CREATE INDEX "agent_messages_agent_assignment_id_idx" ON "agent_messages"("agent_assignment_id");

-- CreateIndex
CREATE INDEX "agent_decision_logs_agent_assignment_id_idx" ON "agent_decision_logs"("agent_assignment_id");

-- CreateIndex
CREATE INDEX "automation_approval_requests_status_idx" ON "automation_approval_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "repositories_slug_key" ON "repositories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "branches_repository_id_name_key" ON "branches"("repository_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_repository_id_number_key" ON "pull_requests"("repository_id", "number");

-- CreateIndex
CREATE INDEX "code_changes_command_run_id_idx" ON "code_changes"("command_run_id");

-- CreateIndex
CREATE INDEX "build_runs_command_run_id_idx" ON "build_runs"("command_run_id");

-- CreateIndex
CREATE INDEX "test_runs_command_run_id_idx" ON "test_runs"("command_run_id");

-- CreateIndex
CREATE INDEX "changed_files_code_change_id_idx" ON "changed_files"("code_change_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_registry_module_key_key" ON "module_registry"("module_key");

-- CreateIndex
CREATE UNIQUE INDEX "block_registry_block_key_key" ON "block_registry"("block_key");

-- CreateIndex
CREATE INDEX "block_registry_module_key_idx" ON "block_registry"("module_key");

-- CreateIndex
CREATE INDEX "layout_slots_page_key_sort_order_idx" ON "layout_slots"("page_key", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "layout_slots_page_key_slot_key_key" ON "layout_slots"("page_key", "slot_key");

-- CreateIndex
CREATE UNIQUE INDEX "node_registry_node_key_key" ON "node_registry"("node_key");

-- CreateIndex
CREATE INDEX "node_registry_module_key_idx" ON "node_registry"("module_key");

-- CreateIndex
CREATE UNIQUE INDEX "query_registry_query_key_key" ON "query_registry"("query_key");

-- CreateIndex
CREATE INDEX "state_transition_logs_entity_type_entity_id_idx" ON "state_transition_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "state_transition_logs_created_at_idx" ON "state_transition_logs"("created_at");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "validation_checks_plan_id_idx" ON "validation_checks"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "quality_gates_gate_key_key" ON "quality_gates"("gate_key");

-- CreateIndex
CREATE INDEX "cost_events_command_run_id_idx" ON "cost_events"("command_run_id");

-- CreateIndex
CREATE INDEX "automation_mail_messages_account_id_idx" ON "automation_mail_messages"("account_id");

-- CreateIndex
CREATE INDEX "automation_portal_tasks_automation_project_id_status_idx" ON "automation_portal_tasks"("automation_project_id", "status");

-- CreateIndex
CREATE INDEX "automation_knowledge_documents_automation_project_id_idx" ON "automation_knowledge_documents"("automation_project_id");

-- CreateIndex
CREATE INDEX "mail_derived_candidates_status_candidate_type_created_at_idx" ON "mail_derived_candidates"("status", "candidate_type", "created_at");

-- CreateIndex
CREATE INDEX "mail_derived_candidates_automation_knowledge_document_id_idx" ON "mail_derived_candidates"("automation_knowledge_document_id");

-- CreateIndex
CREATE INDEX "mail_derived_candidates_mail_insight_thread_id_idx" ON "mail_derived_candidates"("mail_insight_thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_derived_candidates_automation_knowledge_document_id_ca_key" ON "mail_derived_candidates"("automation_knowledge_document_id", "candidate_type");

-- CreateIndex
CREATE UNIQUE INDEX "mail_derived_candidates_mail_insight_thread_id_candidate_ty_key" ON "mail_derived_candidates"("mail_insight_thread_id", "candidate_type");

-- CreateIndex
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "runtime_policies_policy_key_key" ON "runtime_policies"("policy_key");

-- CreateIndex
CREATE UNIQUE INDEX "connector_registry_connector_key_key" ON "connector_registry"("connector_key");

-- CreateIndex
CREATE INDEX "codex_tasks_command_run_id_idx" ON "codex_tasks"("command_run_id");

-- CreateIndex
CREATE INDEX "codex_tasks_status_idx" ON "codex_tasks"("status");

-- CreateIndex
CREATE INDEX "codex_task_logs_codex_task_id_idx" ON "codex_task_logs"("codex_task_id");

-- CreateIndex
CREATE INDEX "cursor_sessions_command_run_id_idx" ON "cursor_sessions"("command_run_id");

-- CreateIndex
CREATE INDEX "cursor_sessions_status_idx" ON "cursor_sessions"("status");

-- CreateIndex
CREATE INDEX "github_issues_command_run_id_idx" ON "github_issues"("command_run_id");

-- CreateIndex
CREATE INDEX "github_issues_codex_task_id_idx" ON "github_issues"("codex_task_id");

-- CreateIndex
CREATE INDEX "run_timeline_items_command_run_id_sort_order_idx" ON "run_timeline_items"("command_run_id", "sort_order");

-- CreateIndex
CREATE INDEX "notification_events_command_run_id_idx" ON "notification_events"("command_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "execution_policies_policy_key_key" ON "execution_policies"("policy_key");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_templates_template_key_key" ON "workflow_templates"("template_key");

-- CreateIndex
CREATE INDEX "llm_calls_command_run_id_idx" ON "llm_calls"("command_run_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_catalog_items_skill_key_key" ON "skill_catalog_items"("skill_key");

-- CreateIndex
CREATE INDEX "skill_runs_command_run_id_sort_order_idx" ON "skill_runs"("command_run_id", "sort_order");

-- CreateIndex
CREATE INDEX "work_breakdown_items_command_run_id_sort_order_idx" ON "work_breakdown_items"("command_run_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "agent_assignment_rules_rule_key_key" ON "agent_assignment_rules"("rule_key");

-- CreateIndex
CREATE INDEX "mail_insight_threads_automation_project_id_latest_received__idx" ON "mail_insight_threads"("automation_project_id", "latest_received_at");

-- CreateIndex
CREATE INDEX "mail_insight_threads_automation_knowledge_document_id_idx" ON "mail_insight_threads"("automation_knowledge_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "mail_insight_threads_automation_project_id_thread_key_key" ON "mail_insight_threads"("automation_project_id", "thread_key");

-- CreateIndex
CREATE INDEX "policy_memories_automation_project_id_memory_type_status_idx" ON "policy_memories"("automation_project_id", "memory_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "policy_memories_automation_project_id_memory_type_key_key" ON "policy_memories"("automation_project_id", "memory_type", "key");

-- CreateIndex
CREATE INDEX "policy_decision_logs_automation_project_id_decision_type_cr_idx" ON "policy_decision_logs"("automation_project_id", "decision_type", "created_at");

-- CreateIndex
CREATE INDEX "policy_decision_logs_entity_type_entity_id_idx" ON "policy_decision_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailItem" ADD CONSTRAINT "MailItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionSource" ADD CONSTRAINT "IngestionSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionItem" ADD CONSTRAINT "IngestionItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionItem" ADD CONSTRAINT "IngestionItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionItem" ADD CONSTRAINT "IngestionItem_relatedMailItemId_fkey" FOREIGN KEY ("relatedMailItemId") REFERENCES "MailItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionItem" ADD CONSTRAINT "IngestionItem_relatedRunId_fkey" FOREIGN KEY ("relatedRunId") REFERENCES "ExecutionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionJob" ADD CONSTRAINT "IngestionJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresalesReview" ADD CONSTRAINT "PresalesReview_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresalesReview" ADD CONSTRAINT "PresalesReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_mailItemId_fkey" FOREIGN KEY ("mailItemId") REFERENCES "MailItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionRun" ADD CONSTRAINT "ExecutionRun_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunStep" ADD CONSTRAINT "RunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ExecutionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalItem" ADD CONSTRAINT "ApprovalItem_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolConnection" ADD CONSTRAINT "ToolConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeDocument" ADD CONSTRAINT "KnowledgeDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceItem" ADD CONSTRAINT "FinanceItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_projects" ADD CONSTRAINT "automation_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_project_members" ADD CONSTRAINT "automation_project_members_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_project_members" ADD CONSTRAINT "automation_project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workspaces" ADD CONSTRAINT "automation_workspaces_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_values" ADD CONSTRAINT "config_values_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "config_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_runs" ADD CONSTRAINT "command_runs_command_id_fkey" FOREIGN KEY ("command_id") REFERENCES "commands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_runs" ADD CONSTRAINT "command_runs_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_runs" ADD CONSTRAINT "command_runs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "improvement_candidates" ADD CONSTRAINT "improvement_candidates_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_steps" ADD CONSTRAINT "automation_workflow_steps_automation_workflow_id_fkey" FOREIGN KEY ("automation_workflow_id") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_assignments" ADD CONSTRAINT "agent_assignments_automation_workflow_step_id_fkey" FOREIGN KEY ("automation_workflow_step_id") REFERENCES "automation_workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_agent_assignment_id_fkey" FOREIGN KEY ("agent_assignment_id") REFERENCES "agent_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_automation_workflow_step_id_fkey" FOREIGN KEY ("automation_workflow_step_id") REFERENCES "automation_workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_reports" ADD CONSTRAINT "automation_reports_validation_result_id_fkey" FOREIGN KEY ("validation_result_id") REFERENCES "validation_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_analyses" ADD CONSTRAINT "intent_analyses_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_analyses" ADD CONSTRAINT "risk_analyses_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_agent_assignment_id_fkey" FOREIGN KEY ("agent_assignment_id") REFERENCES "agent_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_decision_logs" ADD CONSTRAINT "agent_decision_logs_agent_assignment_id_fkey" FOREIGN KEY ("agent_assignment_id") REFERENCES "agent_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_pull_request_id_fkey" FOREIGN KEY ("pull_request_id") REFERENCES "pull_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_changes" ADD CONSTRAINT "code_changes_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_runs" ADD CONSTRAINT "build_runs_code_change_id_fkey" FOREIGN KEY ("code_change_id") REFERENCES "code_changes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_build_run_id_fkey" FOREIGN KEY ("build_run_id") REFERENCES "build_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changed_files" ADD CONSTRAINT "changed_files_code_change_id_fkey" FOREIGN KEY ("code_change_id") REFERENCES "code_changes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "block_registry" ADD CONSTRAINT "block_registry_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "module_registry"("module_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_slots" ADD CONSTRAINT "layout_slots_block_registry_id_fkey" FOREIGN KEY ("block_registry_id") REFERENCES "block_registry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_registry" ADD CONSTRAINT "node_registry_module_key_fkey" FOREIGN KEY ("module_key") REFERENCES "module_registry"("module_key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_checks" ADD CONSTRAINT "validation_checks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "validation_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_mail_accounts" ADD CONSTRAINT "automation_mail_accounts_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_mail_messages" ADD CONSTRAINT "automation_mail_messages_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "automation_mail_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_portal_tasks" ADD CONSTRAINT "automation_portal_tasks_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_knowledge_documents" ADD CONSTRAINT "automation_knowledge_documents_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_derived_candidates" ADD CONSTRAINT "mail_derived_candidates_mail_insight_thread_id_fkey" FOREIGN KEY ("mail_insight_thread_id") REFERENCES "mail_insight_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "automation_knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codex_task_logs" ADD CONSTRAINT "codex_task_logs_codex_task_id_fkey" FOREIGN KEY ("codex_task_id") REFERENCES "codex_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_runs" ADD CONSTRAINT "skill_runs_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_breakdown_items" ADD CONSTRAINT "work_breakdown_items_command_run_id_fkey" FOREIGN KEY ("command_run_id") REFERENCES "command_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_breakdown_items" ADD CONSTRAINT "work_breakdown_items_skill_run_id_fkey" FOREIGN KEY ("skill_run_id") REFERENCES "skill_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_insight_threads" ADD CONSTRAINT "mail_insight_threads_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_insight_threads" ADD CONSTRAINT "mail_insight_threads_automation_knowledge_document_id_fkey" FOREIGN KEY ("automation_knowledge_document_id") REFERENCES "automation_knowledge_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_memories" ADD CONSTRAINT "policy_memories_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_decision_logs" ADD CONSTRAINT "policy_decision_logs_automation_project_id_fkey" FOREIGN KEY ("automation_project_id") REFERENCES "automation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
