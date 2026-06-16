import {
  listLifecycleSummary,
  ensureLifecycleStoreHydrated,
} from "@/lib/lifecycle/lifecycle-api";
import { getPersistenceStatus } from "@/lib/lifecycle/lifecycle-persist";
import { getLifecycleSummaryFromDb } from "@aios/db";

export async function GET() {
  await ensureLifecycleStoreHydrated();
  const persistence = await getPersistenceStatus();
  const memorySummary = listLifecycleSummary();
  let dbSummary: Record<string, number> | null = null;
  if (persistence.available) {
    try {
      dbSummary = await getLifecycleSummaryFromDb();
    } catch {
      dbSummary = null;
    }
  }
  return Response.json({
    summary: memorySummary,
    persistence,
    dbSummary,
  });
}
