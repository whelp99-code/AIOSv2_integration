import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  isLifecyclePersistenceAvailable: vi.fn(),
  getLifecycleSummaryFromDb: vi.fn(),
  listLifecycleRecords: vi.fn(),
}));

const appMocks = vi.hoisted(() => ({
  listLifecycleSummary: vi.fn(),
}));

vi.mock("@aios/db", () => ({
  isLifecyclePersistenceAvailable: dbMocks.isLifecyclePersistenceAvailable,
  getLifecycleSummaryFromDb: dbMocks.getLifecycleSummaryFromDb,
  listLifecycleRecords: dbMocks.listLifecycleRecords,
}));
vi.mock("@aios/application", () => ({
  listLifecycleSummary: appMocks.listLifecycleSummary,
}));

describe("lifecycle read-through", () => {
  beforeEach(() => {
    vi.resetModules();
    appMocks.listLifecycleSummary.mockReturnValue({
      customers: 0,
      partners: 0,
      opportunities: 0,
      proposals: 0,
      projects: 0,
      completions: 0,
      customerProducts: 0,
      maintenanceCases: 0,
      agentTasks: 0,
      improvementTasks: 0,
    });
  });

  it("resolveLifecycleSummary merges DB counts when memory is empty", async () => {
    dbMocks.isLifecyclePersistenceAvailable.mockResolvedValue(true);
    dbMocks.getLifecycleSummaryFromDb.mockResolvedValue({ opportunity: 2 });

    const { resolveLifecycleSummary } = await import(
      "../apps/web/src/lib/lifecycle/lifecycle-read"
    );
    const summary = await resolveLifecycleSummary();
    expect(summary.opportunities).toBe(2);
  });
});
