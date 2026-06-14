import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as collaborationServer from "../../apps/web/src/lib/collaboration/server";

let tempRoot: string;

let projectsGet: typeof import("../../apps/web/src/app/api/vibe-coding/projects/route").GET;
let projectDetailGet: typeof import("../../apps/web/src/app/api/vibe-coding/projects/[id]/route").GET;
let agentsGet: typeof import("../../apps/web/src/app/api/vibe-coding/agents/route").GET;
let agentRunPost: typeof import("../../apps/web/src/app/api/vibe-coding/agents/run/route").POST;
let learningSchedulesGet: typeof import("../../apps/web/src/app/api/vibe-coding/learning/schedules/route").GET;
let learningSchedulesPost: typeof import("../../apps/web/src/app/api/vibe-coding/learning/schedules/route").POST;
let sandboxRunPost: typeof import("../../apps/web/src/app/api/vibe-coding/sandbox/run/route").POST;
let ragIngestPost: typeof import("../../apps/web/src/app/api/vibe-coding/rag/ingest/route").POST;
let approvalsPost: typeof import("../../apps/web/src/app/api/approvals/route").POST;

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
              id: "vibe-agent-run",
              title: "agent run",
              description: "agent run assignment",
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
              id: "vibe-learning-schedule",
              title: "learning schedule",
              description: "learning schedule assignment",
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
              id: "vibe-sandbox-run",
              title: "sandbox run",
              description: "sandbox run assignment",
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
              id: "vibe-rag-ingest-docs",
              title: "rag ingest",
              description: "rag ingest assignment",
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
          metadata: { phase: 5 },
        },
      ],
    }),
    "utf8",
  );
}

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "vibe-phase5-"));
  await setupApprovalState();
  vi.resetModules();

  const [
    projectsRoute,
    projectDetailRoute,
    agentsRoute,
    agentRunRoute,
    learningSchedulesRoute,
    sandboxRunRoute,
    ragIngestRoute,
    approvalsRoute,
  ] = await Promise.all([
    import("../../apps/web/src/app/api/vibe-coding/projects/route"),
    import("../../apps/web/src/app/api/vibe-coding/projects/[id]/route"),
    import("../../apps/web/src/app/api/vibe-coding/agents/route"),
    import("../../apps/web/src/app/api/vibe-coding/agents/run/route"),
    import("../../apps/web/src/app/api/vibe-coding/learning/schedules/route"),
    import("../../apps/web/src/app/api/vibe-coding/sandbox/run/route"),
    import("../../apps/web/src/app/api/vibe-coding/rag/ingest/route"),
    import("../../apps/web/src/app/api/approvals/route"),
  ]);

  projectsGet = projectsRoute.GET;
  projectDetailGet = projectDetailRoute.GET;
  agentsGet = agentsRoute.GET;
  agentRunPost = agentRunRoute.POST;
  learningSchedulesGet = learningSchedulesRoute.GET;
  learningSchedulesPost = learningSchedulesRoute.POST;
  sandboxRunPost = sandboxRunRoute.POST;
  ragIngestPost = ragIngestRoute.POST;
  approvalsPost = approvalsRoute.POST;
});

afterEach(async () => {
  delete process.env.AIOS_APPROVAL_QUEUE_PATH;
  delete process.env.AIOS_COLLABORATION_STATE_PATH;
  delete process.env.AIOS_COLLABORATION_EVIDENCE_DIR;
  vi.resetModules();
  vi.restoreAllMocks();
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
});

describe("Phase 5: Vibe-coding projects proxy", () => {
  it("GET /api/vibe-coding/projects passes through query string", async () => {
    const mockData = { projects: [{ id: "p1", name: "Alpha" }] };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockData));

    const res = await projectsGet(
      new Request(
        "http://localhost/api/vibe-coding/projects?status=active&limit=10",
      ),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual(mockData);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/projects");
    expect(calledUrl).toContain("status=active");
    expect(calledUrl).toContain("limit=10");
    fetchSpy.mockRestore();
  });

  it("GET /api/vibe-coding/projects/[id] encodes path parameter", async () => {
    const mockData = { id: "proj/123", name: "Detail" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockData));

    const res = await projectDetailGet(
      new Request("http://localhost/api/vibe-coding/projects/proj%2F123"),
      { params: Promise.resolve({ id: "proj/123" }) },
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual(mockData);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/projects/proj%2F123");
    fetchSpy.mockRestore();
  });
});

describe("Phase 5: Vibe-coding agents proxy", () => {
  it("GET /api/vibe-coding/agents passes through query string", async () => {
    const mockData = { agents: [{ id: "a1", name: "Coder" }] };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockData));

    const res = await agentsGet(
      new Request("http://localhost/api/vibe-coding/agents?project=p1"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual(mockData);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/agents");
    expect(calledUrl).toContain("project=p1");
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/agents/run without approval returns 409 and does not call upstream", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await agentRunPost(
      new Request("http://localhost/api/vibe-coding/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", prompt: "hello" }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval).toBeDefined();
    expect(data.approval.assignmentId).toBe("vibe-agent-run");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/agents/run with approved approval forwards upstream and strips metadata", async () => {
    const pendingRes = await agentRunPost(
      new Request("http://localhost/api/vibe-coding/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", prompt: "hello" }),
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

    const mockUpstreamResult = { runId: "r-1", status: "started" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockUpstreamResult));

    const res = await agentRunPost(
      new Request("http://localhost/api/vibe-coding/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          agentId: "a1",
          prompt: "hello",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");
    expect(data.approvalId).toBe(approvalId);
    expect(data.result).toEqual(mockUpstreamResult);

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    expect(upstreamBody.agentId).toBe("a1");
    expect(upstreamBody.prompt).toBe("hello");
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/agents/run with rejected approval returns 403", async () => {
    const pendingRes = await agentRunPost(
      new Request("http://localhost/api/vibe-coding/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", prompt: "hello" }),
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

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await agentRunPost(
      new Request("http://localhost/api/vibe-coding/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, agentId: "a1", prompt: "hello" }),
      }),
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.approvalStatus).toBe("rejected");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("Phase 5: Vibe-coding learning schedule proxy", () => {
  it("GET /api/vibe-coding/learning/schedules passes through query string", async () => {
    const mockData = { schedules: [{ id: "s1" }] };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockData));

    const res = await learningSchedulesGet(
      new Request(
        "http://localhost/api/vibe-coding/learning/schedules?project=p1",
      ),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual(mockData);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/learning/schedules");
    expect(calledUrl).toContain("project=p1");
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/learning/schedules without approval returns 409 and does not call upstream", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await learningSchedulesPost(
      new Request("http://localhost/api/vibe-coding/learning/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "rust-basics" }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval.assignmentId).toBe("vibe-learning-schedule");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/learning/schedules with rejected approval returns 403", async () => {
    const pendingRes = await learningSchedulesPost(
      new Request("http://localhost/api/vibe-coding/learning/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "rust-basics" }),
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

    const res = await learningSchedulesPost(
      new Request("http://localhost/api/vibe-coding/learning/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, topic: "rust-basics" }),
      }),
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.approvalStatus).toBe("rejected");
  });

  it("POST /api/vibe-coding/learning/schedules with approved approval forwards upstream and strips metadata", async () => {
    const pendingRes = await learningSchedulesPost(
      new Request("http://localhost/api/vibe-coding/learning/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "rust-basics" }),
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

    const mockUpstreamResult = { scheduleId: "sch-1", status: "active" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockUpstreamResult));

    const res = await learningSchedulesPost(
      new Request("http://localhost/api/vibe-coding/learning/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          topic: "rust-basics",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");
    expect(data.approvalId).toBe(approvalId);
    expect(data.result).toEqual(mockUpstreamResult);

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    expect(upstreamBody.topic).toBe("rust-basics");
    fetchSpy.mockRestore();
  });
});

describe("Phase 5: Vibe-coding sandbox proxy", () => {
  it("POST /api/vibe-coding/sandbox/run without approval returns 409 and does not call upstream", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await sandboxRunPost(
      new Request("http://localhost/api/vibe-coding/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "npm test" }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval.assignmentId).toBe("vibe-sandbox-run");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/sandbox/run with approved approval forwards upstream and strips metadata", async () => {
    const pendingRes = await sandboxRunPost(
      new Request("http://localhost/api/vibe-coding/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "npm test" }),
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

    const mockUpstreamResult = { exitCode: 0, output: "all tests passed" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockUpstreamResult));

    const res = await sandboxRunPost(
      new Request("http://localhost/api/vibe-coding/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          command: "npm test",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");
    expect(data.approvalId).toBe(approvalId);
    expect(data.result).toEqual(mockUpstreamResult);

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    expect(upstreamBody.command).toBe("npm test");
    fetchSpy.mockRestore();
  });
});

describe("Phase 5: Upstream error handling", () => {
  it("GET /api/vibe-coding/projects returns 500 on upstream thrown error", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await projectsGet(
      new Request("http://localhost/api/vibe-coding/projects"),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("vibe-coding projects proxy error");
    expect(data.details).toContain("ECONNREFUSED");
    fetchSpy.mockRestore();
  });

  it("GET /api/vibe-coding/projects passes through upstream HTTP error status", async () => {
    const upstreamError = { error: "not found" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(upstreamError, 404));

    const res = await projectsGet(
      new Request("http://localhost/api/vibe-coding/projects?status=missing"),
    );
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data).toEqual(upstreamError);
    fetchSpy.mockRestore();
  });

  it("GET /api/vibe-coding/agents returns 500 on upstream thrown error", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await agentsGet(
      new Request("http://localhost/api/vibe-coding/agents"),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("vibe-coding agents proxy error");
    fetchSpy.mockRestore();
  });

  it("GET /api/vibe-coding/learning/schedules returns 500 on upstream thrown error", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await learningSchedulesGet(
      new Request("http://localhost/api/vibe-coding/learning/schedules"),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("vibe-coding learning schedules proxy error");
    expect(data.details).toContain("ECONNREFUSED");
    fetchSpy.mockRestore();
  });

  it("GET /api/vibe-coding/projects/[id] returns 500 on upstream thrown error", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await projectDetailGet(
      new Request("http://localhost/api/vibe-coding/projects/proj-1"),
      { params: Promise.resolve({ id: "proj-1" }) },
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("vibe-coding project detail proxy error");
    expect(data.details).toContain("ECONNREFUSED");
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/sandbox/run passes through upstream HTTP error and records no success artifact", async () => {
    const pendingRes = await sandboxRunPost(
      new Request("http://localhost/api/vibe-coding/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "npm test" }),
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

    const upstreamError = {
      error: "bad gateway",
      message: "upstream unavailable",
    };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(upstreamError, 502));

    const addArtifactSpy = vi.spyOn(
      collaborationServer.getCollaborationServices().coordinator,
      "addArtifact",
    );

    const res = await sandboxRunPost(
      new Request("http://localhost/api/vibe-coding/sandbox/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, command: "npm test" }),
      }),
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data).toEqual(upstreamError);
    expect(addArtifactSpy).not.toHaveBeenCalled();

    addArtifactSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it("POST /api/vibe-coding/rag/ingest passes through upstream HTTP error and records no success artifact", async () => {
    const pendingRes = await ragIngestPost(
      new Request("http://localhost/api/vibe-coding/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "docs", sourceType: "markdown" }),
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

    const upstreamError = { error: "rag ingest failed" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(upstreamError, 502));
    const addArtifactSpy = vi.spyOn(
      collaborationServer.getCollaborationServices().coordinator,
      "addArtifact",
    );

    const res = await ragIngestPost(
      new Request("http://localhost/api/vibe-coding/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          title: "docs",
          sourceType: "markdown",
        }),
      }),
    );
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data).toEqual(upstreamError);
    expect(addArtifactSpy).not.toHaveBeenCalled();

    addArtifactSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});
