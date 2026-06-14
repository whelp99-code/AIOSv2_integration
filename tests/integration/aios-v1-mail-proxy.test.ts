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

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "test-user" } })),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const { mockAdapterRequest } = vi.hoisted(() => ({
  mockAdapterRequest: vi.fn(),
}));
vi.mock("@aios/proxy-core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aios/proxy-core")>();
  return {
    ...actual,
    getAiosV1Adapter: () => ({
      ...actual.getAiosV1Adapter(),
      request: mockAdapterRequest,
    }),
  };
});

let tempRoot: string;
let mailImportPost: typeof import("../../apps/web/src/app/api/mail-import/route").POST;
let mailCandidatesGet: typeof import("../../apps/web/src/app/api/mail-candidates/route").GET;
let mailCandidatesPost: typeof import("../../apps/web/src/app/api/mail-candidates/route").POST;
let mailInsightThreadsGet: typeof import("../../apps/web/src/app/api/mail-insight-threads/route").GET;
let mailInsightThreadsPost: typeof import("../../apps/web/src/app/api/mail-insight-threads/route").POST;
let approvalsPost: typeof import("../../apps/web/src/app/api/approvals/route").POST;

beforeAll(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "aios-mail-proxy-"));
});

beforeEach(async () => {
  vi.stubEnv("NODE_ENV", "development");

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
              id: "aios-v1-POST-/api/mail/import",
              title: "mail import",
              description: "mail import assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["external-share"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
            {
              id: "aios-v1-POST-/api/mail/candidates",
              title: "mail candidates",
              description: "mail candidates assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["external-share"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
            {
              id: "aios-v1-POST-/api/mail/insight-threads",
              title: "mail insight threads",
              description: "mail insight threads assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["external-share"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
          ],
          handoffs: [],
          artifacts: [],
          metadata: { phase: 4 },
        },
      ],
    }),
    "utf8",
  );

  vi.resetModules();

  const [importRoute, candidatesRoute, insightThreadsRoute, approvalsRoute] =
    await Promise.all([
      import("../../apps/web/src/app/api/mail-import/route"),
      import("../../apps/web/src/app/api/mail-candidates/route"),
      import("../../apps/web/src/app/api/mail-insight-threads/route"),
      import("../../apps/web/src/app/api/approvals/route"),
    ]);

  mailImportPost = importRoute.POST;
  mailCandidatesGet = candidatesRoute.GET;
  mailCandidatesPost = candidatesRoute.POST;
  mailInsightThreadsGet = insightThreadsRoute.GET;
  mailInsightThreadsPost = insightThreadsRoute.POST;
  approvalsPost = approvalsRoute.POST;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("AIOS v1 Mail Proxy - GET upstream success", () => {
  it("GET /api/mail/candidates returns upstream JSON", async () => {
    const mockCandidates = [
      { id: "mc-1", subject: "Project Alpha", from: "alice@example.com" },
      { id: "mc-2", subject: "Project Beta", from: "bob@example.com" },
    ];

    mockAdapterRequest.mockResolvedValueOnce({
      status: 200,
      headers: { "Content-Type": "application/json" },
      data: mockCandidates,
      latencyMs: 10,
      upstream: "aios-v1",
    });

    const res = await mailCandidatesGet(
      new Request("http://localhost/api/mail/candidates"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe("mc-1");
  });

  it("GET /api/mail/insight-threads returns upstream JSON", async () => {
    const mockThreads = [
      {
        id: "it-1",
        threadId: "t-100",
        subject: "Q2 Planning",
        snippet: "Let's discuss Q2...",
      },
      {
        id: "it-2",
        threadId: "t-200",
        subject: "Budget Review",
        snippet: "Budget numbers...",
      },
    ];

    mockAdapterRequest.mockResolvedValueOnce({
      status: 200,
      headers: { "Content-Type": "application/json" },
      data: mockThreads,
      latencyMs: 10,
      upstream: "aios-v1",
    });

    const res = await mailInsightThreadsGet(
      new Request("http://localhost/api/mail/insight-threads"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].threadId).toBe("t-100");
  });

  it("GET /api/mail/candidates forwards query params", async () => {
    mockAdapterRequest.mockImplementationOnce(async (req: any) => {
      expect(req.query).toBeDefined();
      expect(req.query.limit).toBe("10");
      expect(req.query.offset).toBe("5");
      return {
        status: 200,
        headers: { "Content-Type": "application/json" },
        data: [],
        latencyMs: 10,
        upstream: "aios-v1",
      };
    });

    const res = await mailCandidatesGet(
      new Request("http://localhost/api/mail/candidates?limit=10&offset=5"),
    );
    expect(res.ok).toBe(true);
  });
});

describe("AIOS v1 Mail Proxy - GET upstream failure", () => {
  it("GET /api/mail/candidates returns 502 on upstream failure", async () => {
    mockAdapterRequest.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await mailCandidatesGet(
      new Request("http://localhost/api/mail/candidates"),
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("Proxy error");
    expect(data.message).toContain("ECONNREFUSED");
  });

  it("GET /api/mail/insight-threads returns 502 on upstream failure", async () => {
    mockAdapterRequest.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await mailInsightThreadsGet(
      new Request("http://localhost/api/mail/insight-threads"),
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toBe("Proxy error");
    expect(data.message).toContain("ECONNREFUSED");
  });
});

describe("AIOS v1 Mail Proxy - POST without approval returns 409", () => {
  it("POST /api/mail-import without approvalId returns 409 pending", async () => {
    const res = await mailImportPost(
      new Request("http://localhost/api/mail-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gmail" }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.approvalStatus).toBe("pending");
    expect(body.approval).toBeDefined();
    expect(body.approval.actionType).toBe("external-share");
  });

  it("POST /api/mail/candidates without approvalId returns 409 pending", async () => {
    const res = await mailCandidatesPost(
      new Request("http://localhost/api/mail/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "project" }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.approvalStatus).toBe("pending");
    expect(body.approval).toBeDefined();
    expect(body.approval.actionType).toBe("external-share");
  });

  it("POST /api/mail/insight-threads without approvalId returns 409 pending", async () => {
    const res = await mailInsightThreadsPost(
      new Request("http://localhost/api/mail/insight-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: "t-1" }),
      }),
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.approvalStatus).toBe("pending");
    expect(body.approval).toBeDefined();
    expect(body.approval.actionType).toBe("external-share");
  });
});

describe("AIOS v1 Mail Proxy - approved POST forwards upstream", () => {
  it("POST /api/mail-import with approved approvalId forwards upstream", async () => {
    const pendingRes = await mailImportPost(
      new Request("http://localhost/api/mail-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gmail" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const approveRes = await approvalsPost(
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

    const mockUpstreamResponse = {
      success: true,
      imported: 5,
    };
    mockAdapterRequest.mockResolvedValueOnce({
      status: 200,
      headers: { "Content-Type": "application/json" },
      data: mockUpstreamResponse,
      latencyMs: 10,
      upstream: "aios-v1",
    });

    const res = await mailImportPost(
      new Request("http://localhost/api/mail-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gmail", approvalId }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.imported).toBe(5);
  });

  it("POST /api/mail/candidates with approved approvalId forwards upstream", async () => {
    const pendingRes = await mailCandidatesPost(
      new Request("http://localhost/api/mail/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "project" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const approveRes = await approvalsPost(
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

    const mockUpstreamResponse = [{ id: "mc-1", subject: "Found candidate" }];
    mockAdapterRequest.mockResolvedValueOnce({
      status: 200,
      headers: { "Content-Type": "application/json" },
      data: mockUpstreamResponse,
      latencyMs: 10,
      upstream: "aios-v1",
    });

    const res = await mailCandidatesPost(
      new Request("http://localhost/api/mail/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "project", approvalId }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it("POST /api/mail/insight-threads with approved approvalId forwards upstream", async () => {
    const pendingRes = await mailInsightThreadsPost(
      new Request("http://localhost/api/mail/insight-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: "t-1" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const approveRes = await approvalsPost(
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

    const mockUpstreamResponse = {
      insights: [{ topic: "Q2 Planning", sentiment: "positive" }],
    };
    mockAdapterRequest.mockResolvedValueOnce({
      status: 200,
      headers: { "Content-Type": "application/json" },
      data: mockUpstreamResponse,
      latencyMs: 10,
      upstream: "aios-v1",
    });

    const res = await mailInsightThreadsPost(
      new Request("http://localhost/api/mail/insight-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: "t-1", approvalId }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.insights).toHaveLength(1);
  });
});

describe("AIOS v1 Mail Proxy - rejected approval not forwarded", () => {
  it("POST /api/mail-import with rejected approvalId returns 403", async () => {
    const pendingRes = await mailImportPost(
      new Request("http://localhost/api/mail-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gmail" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const rejectRes = await approvalsPost(
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

    mockAdapterRequest.mockClear();

    const res = await mailImportPost(
      new Request("http://localhost/api/mail-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gmail", approvalId }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.approvalStatus).toBe("rejected");
    expect(mockAdapterRequest).not.toHaveBeenCalled();
  });

  it("POST /api/mail/candidates with rejected approvalId returns 403", async () => {
    const pendingRes = await mailCandidatesPost(
      new Request("http://localhost/api/mail/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "project" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const rejectRes = await approvalsPost(
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

    mockAdapterRequest.mockClear();

    const res = await mailCandidatesPost(
      new Request("http://localhost/api/mail/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "project", approvalId }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.approvalStatus).toBe("rejected");
    expect(mockAdapterRequest).not.toHaveBeenCalled();
  });

  it("POST /api/mail/insight-threads with rejected approvalId returns 403", async () => {
    const pendingRes = await mailInsightThreadsPost(
      new Request("http://localhost/api/mail/insight-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: "t-1" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    const rejectRes = await approvalsPost(
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

    mockAdapterRequest.mockClear();

    const res = await mailInsightThreadsPost(
      new Request("http://localhost/api/mail/insight-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: "t-1", approvalId }),
      }),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.approvalStatus).toBe("rejected");
    expect(mockAdapterRequest).not.toHaveBeenCalled();
  });
});
