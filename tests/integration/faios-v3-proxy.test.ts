import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const mockFetch = vi.fn();
const originalFetch = globalThis.fetch;

let tempRoot: string;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function setupApprovalState() {
  const approvalsPath = join(tempRoot, `approval-queue-${Date.now()}.json`);
  const collaborationStatePath = join(
    tempRoot,
    `collaboration-state-${Date.now()}.json`,
  );
  const evidenceDir = join(tempRoot, `evidence-${Date.now()}`);

  process.env.AIOS_APPROVAL_QUEUE_PATH = approvalsPath;
  process.env.AIOS_COLLABORATION_STATE_PATH = collaborationStatePath;
  process.env.AIOS_COLLABORATION_EVIDENCE_DIR = evidenceDir;

  await writeFile(approvalsPath, "[]\n", "utf8");
  await writeFile(
    collaborationStatePath,
    JSON.stringify({
      schemaVersion: 1,
      projects: [],
      sessions: [
        {
          id: "cursor-opencode-main-session",
          status: "in-progress",
          objective: "test",
          participants: [],
          assignments: [
            {
              id: "faios-v3-orchestrator-run",
              title: "orchestrator run",
              description: "orchestrator run assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["deploy"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
            {
              id: "faios-v3-lightrag-ingest",
              title: "lightrag ingest",
              description: "lightrag ingest assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["data-mutation"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
          ],
          handoffs: [],
          artifacts: [],
          metadata: { phase: 3 },
        },
      ],
    }),
    "utf8",
  );
}

beforeAll(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "faios-v3-proxy-"));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("F-aios-v3 Proxy - GET upstream success", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development");
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("GET /api/aios-v3/orchestrator returns upstream JSON", async () => {
    const mockData = { workflows: [{ id: "wf-1", name: "test" }] };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const res = await GET(
      new Request("http://localhost/api/aios-v3/orchestrator"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workflows).toHaveLength(1);
    expect(body.workflows[0].id).toBe("wf-1");
  });

  it("GET /api/aios-v3/monitoring returns upstream JSON", async () => {
    const mockData = { status: "healthy", uptime: 99.9 };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/monitoring/route");
    const res = await GET(
      new Request("http://localhost/api/aios-v3/monitoring"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.uptime).toBe(99.9);
  });

  it("GET /api/aios-v3/lightrag passes query to upstream search path", async () => {
    const mockData = { results: [{ id: "r-1", text: "match" }] };
    mockFetch.mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/api/lightrag/search?q=test%20query");
      return jsonResponse(mockData);
    });

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const req = new Request(
      "http://localhost/api/aios-v3/lightrag?q=test%20query",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
  });

  it("GET /api/aios-v3/lightrag without query uses base path", async () => {
    const mockData = { documents: [] };
    mockFetch.mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/api/lightrag");
      expect(url).not.toContain("/api/lightrag/search");
      return jsonResponse(mockData);
    });

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const req = new Request("http://localhost/api/aios-v3/lightrag");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe("F-aios-v3 Proxy - upstream failure", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development");
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("GET /api/aios-v3/orchestrator returns error on upstream failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const res = await GET(
      new Request("http://localhost/api/aios-v3/orchestrator"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("orchestrator");
    expect(body.details).toContain("ECONNREFUSED");
  });

  it("GET /api/aios-v3/monitoring returns error on upstream failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ETIMEDOUT"));

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/monitoring/route");
    const res = await GET(
      new Request("http://localhost/api/aios-v3/monitoring"),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("monitoring");
    expect(body.details).toContain("ETIMEDOUT");
  });

  it("GET /api/aios-v3/lightrag returns error on upstream failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("connection refused"));

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const req = new Request("http://localhost/api/aios-v3/lightrag");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("lightrag");
  });
});

describe("F-aios-v3 Proxy - POST without approval returns 409", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setupApprovalState();
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("POST /api/aios-v3/orchestrator without approvalId returns 409 pending", async () => {
    const { POST } =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const res = await POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1" }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.approvalStatus).toBe("pending");
    expect(body.approval).toBeDefined();
    expect(body.approval.actionType).toBe("deploy");
  });

  it("POST /api/aios-v3/lightrag without approvalId returns 409 pending", async () => {
    const { POST } =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const res = await POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [{ text: "doc" }] }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.approvalStatus).toBe("pending");
    expect(body.approval).toBeDefined();
    expect(body.approval.actionType).toBe("data-mutation");
  });
});

describe("F-aios-v3 Proxy - approved POST forwards upstream", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setupApprovalState();
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("POST /api/aios-v3/orchestrator with approved approvalId forwards upstream", async () => {
    const orchestratorRoute =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const approvalsRoute =
      await import("../../apps/web/src/app/api/approvals/route");

    const pendingRes = await orchestratorRoute.POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1", input: { key: "value" } }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const approveRes = await approvalsRoute.POST(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "approved",
          resolvedBy: "qa-user",
          resolution: "approved in test",
        }),
      }),
    );
    expect(approveRes.ok).toBe(true);

    const mockUpstreamResponse = { success: true, runId: "run-123" };
    let upstreamBody: unknown;
    mockFetch.mockImplementationOnce(
      async (_url: string, init: RequestInit) => {
        upstreamBody = JSON.parse(init.body as string);
        return jsonResponse(mockUpstreamResponse);
      },
    );

    const res = await orchestratorRoute.POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: "wf-1",
          input: { key: "value" },
          approvalId,
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.runId).toBe("run-123");
    expect(data.approvalStatus).toBe("approved");
    expect(upstreamBody).toBeDefined();
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect((upstreamBody as Record<string, unknown>).workflowId).toBe("wf-1");
  });

  it("POST /api/aios-v3/lightrag with approved approvalId forwards upstream", async () => {
    const lightragRoute =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const approvalsRoute =
      await import("../../apps/web/src/app/api/approvals/route");

    const pendingRes = await lightragRoute.POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [{ text: "ingest me" }] }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const approveRes = await approvalsRoute.POST(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "approved",
          resolvedBy: "qa-user",
          resolution: "approved in test",
        }),
      }),
    );
    expect(approveRes.ok).toBe(true);

    const mockUpstreamResponse = { success: true, ingested: 3 };
    let upstreamBody: unknown;
    mockFetch.mockImplementationOnce(
      async (_url: string, init: RequestInit) => {
        upstreamBody = JSON.parse(init.body as string);
        return jsonResponse(mockUpstreamResponse);
      },
    );

    const res = await lightragRoute.POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [{ text: "ingest me" }],
          approvalId,
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.ingested).toBe(3);
    expect(data.approvalStatus).toBe("approved");
    expect(upstreamBody).toBeDefined();
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect((upstreamBody as Record<string, unknown>).documents).toStrictEqual([
      { text: "ingest me" },
    ]);
  });
});

describe("F-aios-v3 Proxy - approved POST upstream failure", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setupApprovalState();
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("POST /api/aios-v3/orchestrator returns upstream error status on failure", async () => {
    const orchestratorRoute =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const approvalsRoute =
      await import("../../apps/web/src/app/api/approvals/route");

    const pendingRes = await orchestratorRoute.POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approvalsRoute.POST(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "approved",
          resolvedBy: "qa-user",
          resolution: "approved in test",
        }),
      }),
    );

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "internal failure" }, 502),
    );

    const res = await orchestratorRoute.POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1", approvalId }),
      }),
    );
    expect(res.status).toBe(502);
  });

  it("POST /api/aios-v3/lightrag returns upstream error status on failure", async () => {
    const lightragRoute =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const approvalsRoute =
      await import("../../apps/web/src/app/api/approvals/route");

    const pendingRes = await lightragRoute.POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [{ text: "doc" }] }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approvalsRoute.POST(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "approved",
          resolvedBy: "qa-user",
          resolution: "approved in test",
        }),
      }),
    );

    mockFetch.mockResolvedValueOnce(
      jsonResponse({ error: "bad gateway" }, 502),
    );

    const res = await lightragRoute.POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [{ text: "doc" }],
          approvalId,
        }),
      }),
    );
    expect(res.status).toBe(502);
  });
});

describe("F-aios-v3 Proxy - rejected approval returns 403", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setupApprovalState();
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("POST /api/aios-v3/orchestrator with rejected approvalId returns 403", async () => {
    const orchestratorRoute =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const approvalsRoute =
      await import("../../apps/web/src/app/api/approvals/route");

    const pendingRes = await orchestratorRoute.POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const rejectRes = await approvalsRoute.POST(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "rejected",
          resolvedBy: "qa-user",
          resolution: "rejected in test",
        }),
      }),
    );
    expect(rejectRes.ok).toBe(true);

    const res = await orchestratorRoute.POST(
      new Request("http://localhost/api/aios-v3/orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1", approvalId }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.approvalStatus).toBe("rejected");
  });

  it("POST /api/aios-v3/lightrag with rejected approvalId returns 403", async () => {
    const lightragRoute =
      await import("../../apps/web/src/app/api/aios-v3/lightrag/route");
    const approvalsRoute =
      await import("../../apps/web/src/app/api/approvals/route");

    const pendingRes = await lightragRoute.POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: [{ text: "doc" }] }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const rejectRes = await approvalsRoute.POST(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "rejected",
          resolvedBy: "qa-user",
          resolution: "rejected in test",
        }),
      }),
    );
    expect(rejectRes.ok).toBe(true);

    const res = await lightragRoute.POST(
      new Request("http://localhost/api/aios-v3/lightrag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: [{ text: "doc" }],
          approvalId,
        }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.approvalStatus).toBe("rejected");
  });
});

describe("F-aios-v3 Proxy - GET query string passthrough", () => {
  beforeEach(async () => {
    vi.stubEnv("NODE_ENV", "development");
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it("GET /api/aios-v3/orchestrator passes query string to upstream", async () => {
    mockFetch.mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/api/orchestrator?status=running&limit=5");
      return jsonResponse({ workflows: [] });
    });

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const req = new Request(
      "http://localhost/api/aios-v3/orchestrator?status=running&limit=5",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("GET /api/aios-v3/monitoring passes query string to upstream", async () => {
    mockFetch.mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/api/monitoring?window=1h&format=summary");
      return jsonResponse({ status: "ok" });
    });

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/monitoring/route");
    const req = new Request(
      "http://localhost/api/aios-v3/monitoring?window=1h&format=summary",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("GET /api/aios-v3/orchestrator without query uses clean path", async () => {
    mockFetch.mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/api/orchestrator");
      expect(url).not.toContain("?");
      return jsonResponse({ workflows: [] });
    });

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/orchestrator/route");
    const req = new Request("http://localhost/api/aios-v3/orchestrator");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("GET /api/aios-v3/monitoring without query uses clean path", async () => {
    mockFetch.mockImplementationOnce(async (url: string) => {
      expect(url).toContain("/api/monitoring");
      expect(url).not.toContain("?");
      return jsonResponse({ status: "ok" });
    });

    const { GET } =
      await import("../../apps/web/src/app/api/aios-v3/monitoring/route");
    const req = new Request("http://localhost/api/aios-v3/monitoring");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
