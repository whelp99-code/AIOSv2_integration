/**
 * Hydrate in-memory lifecycle store from PostgreSQL on cold start.
 */

import type { LifecycleStore } from "@aios/application";
import { getLifecycleStore } from "@aios/application";
import {
  isLifecyclePersistenceAvailable,
  listAllLifecycleRecords,
  type LifecycleEntityType,
} from "@aios/db";

let hydratePromise: Promise<void> | null = null;
let hydrated = false;

const ENTITY_MAP: Partial<
  Record<LifecycleEntityType, keyof LifecycleStore>
> = {
  customer_candidate: "customers",
  partner_candidate: "partners",
  contact: "contacts",
  customer_interest: "interests",
  pain_point: "painPoints",
  opportunity: "opportunities",
  sales_proposal: "proposals",
  lifecycle_project: "projects",
  estimate: "estimates",
  proposal_document: "proposalDocuments",
  poc_plan: "pocPlans",
  project_completion: "completions",
  cfo_handoff: "cfoHandoffs",
  customer_product: "customerProducts",
  maintenance_case: "maintenanceCases",
  agent_task: "agentTasks",
  workflow_run: "workflowRuns",
  improvement_task: "improvementTasks",
  dev_project: "devProjects",
  solution_candidate: "solutionCandidates",
};

function applyRecord(
  store: LifecycleStore,
  entityType: LifecycleEntityType,
  recordId: string,
  payload: Record<string, unknown>,
): void {
  const mapKey = ENTITY_MAP[entityType];
  if (!mapKey) return;
  const id = typeof payload.id === "string" ? payload.id : recordId;
  if (!id) return;
  const map = store[mapKey] as Map<string, unknown>;
  if (!(map instanceof Map)) return;
  map.set(id, { ...payload, id });
}

export async function ensureLifecycleStoreHydrated(): Promise<void> {
  if (hydrated) return;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      const available = await isLifecyclePersistenceAvailable();
      const store = getLifecycleStore();
      let loaded = 0;
      if (available) {
        const records = await listAllLifecycleRecords();
        for (const record of records) {
          applyRecord(store, record.entityType, record.id, record.payload);
          loaded += 1;
        }
      }
      hydrated = true;
    })();
  }
  await hydratePromise;
}

export async function getHydratedLifecycleStore(): Promise<LifecycleStore> {
  await ensureLifecycleStoreHydrated();
  return getLifecycleStore();
}

/** Test-only reset */
export function resetLifecycleHydrationState(): void {
  hydrated = false;
  hydratePromise = null;
}
