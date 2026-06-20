-- CreateTable
CREATE TABLE "lifecycle_records" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "domain" TEXT,
    "sourceThreadKey" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lifecycle_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lifecycle_records_entityType_idx" ON "lifecycle_records"("entityType");

-- CreateIndex
CREATE INDEX "lifecycle_records_domain_idx" ON "lifecycle_records"("domain");

-- CreateIndex
CREATE INDEX "lifecycle_records_sourceThreadKey_idx" ON "lifecycle_records"("sourceThreadKey");

-- CreateIndex
CREATE INDEX "lifecycle_records_projectId_idx" ON "lifecycle_records"("projectId");
