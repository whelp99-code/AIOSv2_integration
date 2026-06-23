-- CreateEnum
CREATE TYPE "PersonaType" AS ENUM ('WORK_SUPPORT', 'SALES', 'PRESALES', 'ENGINEER', 'PM', 'FINANCE', 'MARKETING', 'CEO');

-- CreateEnum
CREATE TYPE "PersonaActionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REQUIRES_APPROVAL');

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "type" "PersonaType" NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_classifications" (
    "id" TEXT NOT NULL,
    "mail_id" TEXT NOT NULL,
    "persona_type" "PersonaType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matched_rules" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_actions" (
    "id" TEXT NOT NULL,
    "persona_type" "PersonaType" NOT NULL,
    "mail_id" TEXT,
    "action" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "status" "PersonaActionStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persona_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personas_type_key" ON "personas"("type");

-- CreateIndex
CREATE INDEX "mail_classifications_mail_id_idx" ON "mail_classifications"("mail_id");

-- CreateIndex
CREATE INDEX "mail_classifications_persona_type_idx" ON "mail_classifications"("persona_type");

-- CreateIndex
CREATE INDEX "mail_classifications_status_idx" ON "mail_classifications"("status");

-- CreateIndex
CREATE INDEX "persona_actions_persona_type_idx" ON "persona_actions"("persona_type");

-- CreateIndex
CREATE INDEX "persona_actions_mail_id_idx" ON "persona_actions"("mail_id");

-- CreateIndex
CREATE INDEX "persona_actions_status_idx" ON "persona_actions"("status");

-- AddForeignKey
ALTER TABLE "mail_classifications" ADD CONSTRAINT "mail_classifications_persona_type_fkey" FOREIGN KEY ("persona_type") REFERENCES "personas"("type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_actions" ADD CONSTRAINT "persona_actions_persona_type_fkey" FOREIGN KEY ("persona_type") REFERENCES "personas"("type") ON DELETE RESTRICT ON UPDATE CASCADE;
