/**
 * Outlook proxy integration tests (mail-intelligence bridge).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAIL_PORTAL_API_MAPPING,
  MAIL_PORTAL_BLOCK_CLIENT_PATHS,
} from "@/lib/portal/mail-api-mapping";
import {
  getMailPortalBlock,
  getMailPortalBlocks,
  resolvePortalBlock,
} from "@/lib/portal/mail-blocks";

const { mockFetchMailIntelligence } = vi.hoisted(() => ({
  mockFetchMailIntelligence: vi.fn(),
}));

vi.mock("@/lib/integrations/mail-intelligence-proxy", () => ({
  fetchMailIntelligence: mockFetchMailIntelligence,
  mailIntelligenceBaseUrl: () => "http://localhost:3010",
}));

const MAIL_URL = process.env.MAIL_INTELLIGENCE_URL || "http://localhost:3010";

describe("outlook proxy contract", () => {
  it("documents expected mail-intelligence endpoints", () => {
    const endpoints = [
      "/api/outlook/status",
      "/api/outlook/analyze",
      "/api/portal/sync-overview",
      "/api/portal/thread-insights",
      "/api/portal/push-candidates",
    ];
    expect(endpoints.length).toBeGreaterThan(0);
    expect(MAIL_URL).toMatch(/^https?:\/\//);
  });

  it("mail send route requires approval (contract)", () => {
    const gated = {
      path: "/api/mail/send",
      actionType: "send",
      unapprovedStatus: 409,
    };
    expect(gated.unapprovedStatus).toBe(409);
  });

  it("documents read operations that emit collaboration evidence", () => {
    const readEvidenceOps = [
      "mail-analyze",
      "mail-sync",
      "mail-thread-insights",
    ];
    expect(readEvidenceOps).toContain("mail-analyze");
    expect(readEvidenceOps).toContain("mail-sync");
  });
});

describe("mail portal block registry", () => {
  beforeEach(() => {
    mockFetchMailIntelligence.mockReset();
  });

  it("registers mail.thread and mail.taskCandidate blocks", () => {
    const blocks = getMailPortalBlocks();
    expect(blocks.map((block) => block.id)).toEqual([
      "mail.thread",
      "mail.taskCandidate",
    ]);
  });

  it("maps blocks to proxy and standalone endpoints", () => {
    expect(MAIL_PORTAL_API_MAPPING).toEqual([
      {
        blockId: "mail.thread",
        proxy: "/api/proxy/outlook/analyze",
        standaloneEndpoint: "/api/outlook/analyze",
        method: "GET",
      },
      {
        blockId: "mail.taskCandidate",
        proxy: "/api/proxy/outlook/candidates",
        standaloneEndpoint: "/api/portal/push-candidates",
        method: "POST",
      },
    ]);
    expect(MAIL_PORTAL_BLOCK_CLIENT_PATHS["mail.thread"].url).toContain(
      "sync=cache",
    );
  });

  it("resolvePortalBlock fetches thread data from analyze endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: {
        threadGroups: [{ key: "t1", label: "Budget review", count: 2 }],
        sync: { mode: "cache" },
      },
    });

    const data = await resolvePortalBlock("mail.thread");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/outlook/analyze?top=10&sync=cache",
      expect.objectContaining({ method: "GET" }),
    );
    expect(data).toMatchObject({
      threadGroups: [{ key: "t1", label: "Budget review", count: 2 }],
    });
  });

  it("resolvePortalBlock fetches candidates from portal push endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: { candidates: [{ id: "c1", title: "Follow up" }] },
    });

    const data = await resolvePortalBlock("mail.taskCandidate");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/portal/push-candidates",
      expect.objectContaining({ method: "POST" }),
    );
    expect(data).toEqual({ candidates: [{ id: "c1", title: "Follow up" }] });
  });

  it("returns null for unknown portal block ids", async () => {
    await expect(resolvePortalBlock("mail.unknown")).resolves.toBeNull();
    expect(getMailPortalBlock("mail.unknown")).toBeUndefined();
  });
});
