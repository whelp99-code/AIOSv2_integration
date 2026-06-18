import { listLifecycleSummary } from "@aios/application";
import {
  getLifecycleSummaryFromDb,
  isLifecyclePersistenceAvailable,
} from "@aios/db";

type LifecycleSummary = ReturnType<typeof listLifecycleSummary>;

const DB_ENTITY_TO_SUMMARY_KEY: Record<string, keyof LifecycleSummary> = {
  customer_candidate: "customers",
  partner_candidate: "partners",
  opportunity: "opportunities",
  sales_proposal: "proposals",
  lifecycle_project: "projects",
  project_completion: "completions",
  customer_product: "customerProducts",
  maintenance_case: "maintenanceCases",
  agent_task: "agentTasks",
  improvement_task: "improvementTasks",
};

export async function resolveLifecycleSummary(): Promise<LifecycleSummary> {
  const memory = listLifecycleSummary();
  const available = await isLifecyclePersistenceAvailable();
  if (!available) {
    return memory;
  }

  const dbSummary = await getLifecycleSummaryFromDb();
  const merged = { ...memory };

  for (const [entityType, count] of Object.entries(dbSummary)) {
    const key = DB_ENTITY_TO_SUMMARY_KEY[entityType];
    if (!key || count <= 0) {
      continue;
    }
    if (merged[key] === 0) {
      merged[key] = count;
    }
  }

  return merged;
}
