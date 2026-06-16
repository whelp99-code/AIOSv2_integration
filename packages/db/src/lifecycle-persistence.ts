/**
 * Prisma persistence for lifecycle entities (raw SQL — works before client regen).
 */

import { prisma } from "./client";

export type LifecycleEntityType =
  | "customer_candidate"
  | "partner_candidate"
  | "contact"
  | "customer_interest"
  | "pain_point"
  | "opportunity"
  | "sales_proposal"
  | "lifecycle_project"
  | "estimate"
  | "proposal_document"
  | "poc_plan"
  | "project_completion"
  | "cfo_handoff"
  | "customer_product"
  | "maintenance_case"
  | "agent_task"
  | "workflow_run"
  | "improvement_task"
  | "dev_project"
  | "solution_candidate";

export interface LifecyclePersistInput {
  id: string;
  entityType: LifecycleEntityType;
  status: string;
  payload: Record<string, unknown>;
  domain?: string;
  sourceThreadKey?: string;
  projectId?: string;
  userId?: string;
}

type LifecycleRow = {
  id: string;
  status: string;
  payload: Record<string, unknown>;
};

export async function isLifecyclePersistenceAvailable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function upsertLifecycleRecord(
  input: LifecyclePersistInput,
): Promise<void> {
  const payloadJson = JSON.stringify(input.payload);
  await prisma.$executeRaw`
    INSERT INTO "lifecycle_records" (
      "id", "entityType", "status", "payload", "domain",
      "sourceThreadKey", "projectId", "userId", "createdAt", "updatedAt"
    ) VALUES (
      ${input.id},
      ${input.entityType},
      ${input.status},
      ${payloadJson}::jsonb,
      ${input.domain ?? null},
      ${input.sourceThreadKey ?? null},
      ${input.projectId ?? null},
      ${input.userId ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT ("id") DO UPDATE SET
      "status" = EXCLUDED."status",
      "payload" = EXCLUDED."payload",
      "domain" = EXCLUDED."domain",
      "sourceThreadKey" = EXCLUDED."sourceThreadKey",
      "projectId" = EXCLUDED."projectId",
      "userId" = EXCLUDED."userId",
      "updatedAt" = NOW()
  `;
}

export async function findLifecycleRecordByDomain(
  entityType: LifecycleEntityType,
  domain: string,
): Promise<{ id: string; payload: Record<string, unknown> } | null> {
  const rows = await prisma.$queryRaw<LifecycleRow[]>`
    SELECT "id", "status", "payload"
    FROM "lifecycle_records"
    WHERE "entityType" = ${entityType}
      AND LOWER("domain") = LOWER(${domain})
    ORDER BY "updatedAt" DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, payload: row.payload };
}

export async function listLifecycleRecords(
  entityType: LifecycleEntityType,
): Promise<LifecycleRow[]> {
  const rows = await prisma.$queryRaw<LifecycleRow[]>`
    SELECT "id", "status", "payload"
    FROM "lifecycle_records"
    WHERE "entityType" = ${entityType}
    ORDER BY "createdAt" DESC
  `;
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    payload:
      typeof row.payload === "string"
        ? (JSON.parse(row.payload) as Record<string, unknown>)
        : row.payload,
  }));
}

export async function listAllLifecycleRecords(): Promise<
  Array<{
    id: string;
    entityType: LifecycleEntityType;
    status: string;
    payload: Record<string, unknown>;
  }>
> {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      entityType: LifecycleEntityType;
      status: string;
      payload: unknown;
    }>
  >`
    SELECT "id", "entityType", "status", "payload"
    FROM "lifecycle_records"
    ORDER BY "createdAt" ASC
  `;
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entityType,
    status: row.status,
    payload:
      typeof row.payload === "string"
        ? (JSON.parse(row.payload) as Record<string, unknown>)
        : (row.payload as Record<string, unknown>),
  }));
}

export async function getLifecycleSummaryFromDb(): Promise<
  Record<string, number>
> {
  const rows = await prisma.$queryRaw<
    Array<{ entityType: string; count: bigint }>
  >`
    SELECT "entityType", COUNT(*)::bigint AS count
    FROM "lifecycle_records"
    GROUP BY "entityType"
  `;
  const summary: Record<string, number> = {};
  for (const row of rows) {
    summary[row.entityType] = Number(row.count);
  }
  return summary;
}
