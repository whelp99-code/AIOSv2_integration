ALTER TABLE "workflows"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'aios-v2';

ALTER TABLE "workflow_executions"
  ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'real',
  ADD COLUMN "engine" TEXT,
  ADD COLUMN "approvalId" TEXT,
  ADD COLUMN "requestedBy" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "traceId" TEXT,
  ADD COLUMN "heartbeatAt" TIMESTAMP(3),
  ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "workflow_executions_idempotencyKey_key"
  ON "workflow_executions"("idempotencyKey");
CREATE UNIQUE INDEX "workflow_executions_traceId_key"
  ON "workflow_executions"("traceId");
CREATE INDEX "workflow_executions_status_createdAt_idx"
  ON "workflow_executions"("status", "createdAt");
CREATE INDEX "workflow_executions_workflowId_startedAt_idx"
  ON "workflow_executions"("workflowId", "startedAt");

CREATE TABLE "workflow_execution_events" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_execution_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workflow_execution_events_executionId_fkey"
    FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "workflow_execution_events_executionId_sequence_key"
  ON "workflow_execution_events"("executionId", "sequence");
CREATE INDEX "workflow_execution_events_executionId_createdAt_idx"
  ON "workflow_execution_events"("executionId", "createdAt");

CREATE TABLE "approval_requests" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "requester" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolution" TEXT,
  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "approval_requests_status_createdAt_idx"
  ON "approval_requests"("status", "createdAt");
CREATE INDEX "approval_requests_sessionId_idx"
  ON "approval_requests"("sessionId");

CREATE TABLE "evidence_artifacts" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT,
  "executionId" TEXT,
  "type" TEXT NOT NULL,
  "path" TEXT,
  "description" TEXT NOT NULL,
  "checksum" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_artifacts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "evidence_artifacts_sessionId_createdAt_idx"
  ON "evidence_artifacts"("sessionId", "createdAt");
CREATE INDEX "evidence_artifacts_executionId_createdAt_idx"
  ON "evidence_artifacts"("executionId", "createdAt");

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "approvalId" TEXT,
  "traceId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_events_resourceType_resourceId_idx"
  ON "audit_events"("resourceType", "resourceId");
CREATE INDEX "audit_events_actorId_createdAt_idx"
  ON "audit_events"("actorId", "createdAt");

CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "outbox_events_status_availableAt_idx"
  ON "outbox_events"("status", "availableAt");

ALTER TABLE "knowledge_documents"
  ADD COLUMN "checksum" TEXT,
  ADD COLUMN "indexStatus" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "externalRef" TEXT,
  ADD COLUMN "metadata" JSONB;
