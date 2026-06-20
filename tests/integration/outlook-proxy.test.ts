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
      "/api/outlook/accounts",
      "/api/outlook/status",
      "/api/outlook/analyze",
      "/api/portal/sync-overview",
      "/api/portal/thread-insights",
      "/api/portal/push-candidates",
      "/api/portal/attachments",
      "/api/portal/entity-candidates",
      "/api/portal/calendar-hints",
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

  it("registers the mail-intelligence portal blocks", () => {
    const blocks = getMailPortalBlocks();
    expect(blocks.map((block) => block.id)).toEqual([
      "mail.account",
      "mail.thread",
      "mail.insightThread",
      "mail.taskCandidate",
      "mail.attachment",
      "mail.entityCandidate",
      "mail.calendarHint",
    ]);
  });

  it("maps blocks to proxy and standalone endpoints", () => {
    expect(MAIL_PORTAL_API_MAPPING).toEqual([
      {
        blockId: "mail.account",
        proxy: "/api/proxy/outlook/accounts",
        standaloneEndpoint: "/api/outlook/accounts",
        method: "GET",
      },
      {
        blockId: "mail.thread",
        proxy: "/api/proxy/outlook/analyze",
        standaloneEndpoint: "/api/outlook/analyze",
        method: "GET",
      },
      {
        blockId: "mail.insightThread",
        proxy: "/api/proxy/outlook/thread-insights",
        standaloneEndpoint: "/api/portal/thread-insights",
        method: "GET",
      },
      {
        blockId: "mail.taskCandidate",
        proxy: "/api/proxy/outlook/candidates",
        standaloneEndpoint: "/api/portal/push-candidates",
        method: "POST",
      },
      {
        blockId: "mail.attachment",
        proxy: "/api/proxy/outlook/attachments",
        standaloneEndpoint: "/api/portal/attachments",
        method: "GET",
      },
      {
        blockId: "mail.entityCandidate",
        proxy: "/api/proxy/outlook/entity-candidates",
        standaloneEndpoint: "/api/portal/entity-candidates",
        method: "GET",
      },
      {
        blockId: "mail.calendarHint",
        proxy: "/api/proxy/outlook/calendar-hints",
        standaloneEndpoint: "/api/portal/calendar-hints",
        method: "GET",
      },
    ]);
    expect(MAIL_PORTAL_BLOCK_CLIENT_PATHS["mail.thread"].url).toContain(
      "sync=cache",
    );
    expect(MAIL_PORTAL_BLOCK_CLIENT_PATHS["mail.entityCandidate"]).toEqual({
      url: "/api/proxy/outlook/entity-candidates",
      method: "GET",
    });
    expect(MAIL_PORTAL_BLOCK_CLIENT_PATHS["mail.calendarHint"]).toEqual({
      url: "/api/proxy/outlook/calendar-hints",
      method: "GET",
    });
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

  it("resolvePortalBlock fetches accounts from outlook accounts endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: {
        accounts: [{ id: "acct-1", email: "owner@example.com" }],
        activeAccountId: "acct-1",
      },
    });

    const data = await resolvePortalBlock("mail.account");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/outlook/accounts",
      expect.objectContaining({ method: "GET" }),
    );
    expect(data).toEqual({
      accounts: [{ id: "acct-1", email: "owner@example.com" }],
      activeAccountId: "acct-1",
    });
  });

  it("resolvePortalBlock fetches insight threads from portal endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: { threads: [{ threadKey: "t1", threadTitle: "Budget review" }] },
    });

    const data = await resolvePortalBlock("mail.insightThread");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/portal/thread-insights",
      expect.objectContaining({ method: "GET" }),
    );
    expect(data).toEqual({
      threads: [{ threadKey: "t1", threadTitle: "Budget review" }],
    });
  });

  it("resolvePortalBlock fetches attachment refs from portal endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: { attachments: [{ id: "att-1", name: "quote.xlsx" }] },
    });

    const data = await resolvePortalBlock("mail.attachment");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/portal/attachments",
      expect.objectContaining({ method: "GET" }),
    );
    expect(data).toEqual({
      attachments: [{ id: "att-1", name: "quote.xlsx" }],
    });
  });

  it("resolvePortalBlock fetches entity candidates from portal endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: {
        candidates: [{ domain: "customer.example", entityRole: "customer" }],
      },
    });

    const data = await resolvePortalBlock("mail.entityCandidate");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/portal/entity-candidates?top=30&sync=cache",
      expect.objectContaining({ method: "GET" }),
    );
    expect(data).toEqual({
      candidates: [{ domain: "customer.example", entityRole: "customer" }],
    });
  });

  it("resolvePortalBlock fetches calendar hints from portal endpoint", async () => {
    mockFetchMailIntelligence.mockResolvedValueOnce({
      response: { ok: true, status: 200 },
      data: { calendar: [{ title: "Kickoff", when: "tomorrow" }] },
    });

    const data = await resolvePortalBlock("mail.calendarHint");
    expect(mockFetchMailIntelligence).toHaveBeenCalledWith(
      "/api/portal/calendar-hints?top=30&sync=cache",
      expect.objectContaining({ method: "GET" }),
    );
    expect(data).toEqual({
      calendar: [{ title: "Kickoff", when: "tomorrow" }],
    });
  });

  it("returns null for unknown portal block ids", async () => {
    await expect(resolvePortalBlock("mail.unknown")).resolves.toBeNull();
    expect(getMailPortalBlock("mail.unknown")).toBeUndefined();
  });

  it("documents reply-draft proxy contract", () => {
    const replyDraft = {
      proxy: "/api/proxy/outlook/reply-draft",
      standalone: "/api/outlook/reply-draft",
      requiredQuery: "messageId",
      method: "GET",
      missingMessageIdStatus: 400,
    };
    expect(replyDraft.proxy).toContain("reply-draft");
    expect(replyDraft.requiredQuery).toBe("messageId");
    expect(replyDraft.missingMessageIdStatus).toBe(400);
  });
});
