import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import { createServer, type Server } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let server: Server;
let apiBaseUrl = "";
let approvalsGet: typeof import("../apps/web/src/app/api/approvals/route").GET;
let approvalsPost: typeof import("../apps/web/src/app/api/approvals/route").POST;
let collaborationSessionsGet: typeof import("../apps/web/src/app/api/collaboration/sessions/route").GET;
let collaborationExecutePost: typeof import("../apps/web/src/app/api/collaboration/execute/route").POST;
let collaborationResumePost: typeof import("../apps/web/src/app/api/collaboration/assignments/[assignmentId]/resume/route").POST;
let aiosV3HealthGet: typeof import("../apps/web/src/app/api/aios-v3/health/route").GET;
let integrationsHealthGet: typeof import("../apps/web/src/app/api/integrations/health/route").GET;
let opsSummaryGet: typeof import("../apps/web/src/app/api/ops/summary/route").GET;
let opsDispatchPost: typeof import("../apps/web/src/app/api/ops/dispatch/route").POST;
let sangforExecutePost: typeof import("../apps/web/src/app/api/sangfor/workflows/[id]/execute/route").POST;
let vibeIngestPost: typeof import("../apps/web/src/app/api/vibe-coding/rag/ingest/route").POST;
let collaborationPageModule: typeof import("../apps/web/src/app/collaboration/page");

beforeAll(async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "aios-collab-int-"));
  const collaborationStatePath = join(tempRoot, "collaboration-state.json");
  const approvalsPath = join(tempRoot, "approval-queue.json");
  const evidenceDir = join(tempRoot, "evidence");
  const cursorScript = join(tempRoot, "cursor-agent.sh");
  const opencodeScript = join(tempRoot, "opencode-agent.sh");

  process.env.AIOS_COLLABORATION_STATE_PATH = collaborationStatePath;
  process.env.AIOS_APPROVAL_QUEUE_PATH = approvalsPath;
  process.env.AIOS_COLLABORATION_EVIDENCE_DIR = evidenceDir;
  process.env.CURSOR_AGENT_COMMAND = cursorScript;
  process.env.OPENCODE_COMMAND = opencodeScript;
  process.env.AIOS_ALLOW_DEV_APPROVAL_BYPASS = "true";

  await writeFile(cursorScript, '#!/bin/sh\nprintf "cursor-ok:%s" "$1"\n', {
    mode: 0o755,
  });
  await writeFile(
    opencodeScript,
    '#!/bin/sh\nprintf "opencode-ok:%s:%s" "$1" "$2"\n',
    { mode: 0o755 },
  );

  vi.resetModules();

  const [
    { createApp },
    approvalsRoute,
    sessionsRoute,
    executeRoute,
    resumeRoute,
    aiosV3Route,
    integrationsRoute,
    opsSummaryRoute,
    opsDispatchRoute,
    sangforExecuteRoute,
    vibeIngestRoute,
    pageModule,
  ] = await Promise.all([
    import("../apps/api/src/index"),
    import("../apps/web/src/app/api/approvals/route"),
    import("../apps/web/src/app/api/collaboration/sessions/route"),
    import("../apps/web/src/app/api/collaboration/execute/route"),
    import("../apps/web/src/app/api/collaboration/assignments/[assignmentId]/resume/route"),
    import("../apps/web/src/app/api/aios-v3/health/route"),
    import("../apps/web/src/app/api/integrations/health/route"),
    import("../apps/web/src/app/api/ops/summary/route"),
    import("../apps/web/src/app/api/ops/dispatch/route"),
    import("../apps/web/src/app/api/sangfor/workflows/[id]/execute/route"),
    import("../apps/web/src/app/api/vibe-coding/rag/ingest/route"),
    import("../apps/web/src/app/collaboration/page"),
  ]);

  approvalsGet = approvalsRoute.GET;
  approvalsPost = approvalsRoute.POST;
  collaborationSessionsGet = sessionsRoute.GET;
  collaborationExecutePost = executeRoute.POST;
  collaborationResumePost = resumeRoute.POST;
  aiosV3HealthGet = aiosV3Route.GET;
  integrationsHealthGet = integrationsRoute.GET;
  opsSummaryGet = opsSummaryRoute.GET;
  opsDispatchPost = opsDispatchRoute.POST;
  sangforExecutePost = sangforExecuteRoute.POST;
  vibeIngestPost = vibeIngestRoute.POST;
  collaborationPageModule = pageModule;

  const app = createApp();
  server = createServer(app);
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address() as AddressInfo;
  apiBaseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  delete process.env.AIOS_COLLABORATION_STATE_PATH;
  delete process.env.AIOS_APPROVAL_QUEUE_PATH;
  delete process.env.AIOS_COLLABORATION_EVIDENCE_DIR;
  delete process.env.CURSOR_AGENT_COMMAND;
  delete process.env.OPENCODE_COMMAND;

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
});

describe("Integration: Approvals API", () => {
  it("GET /api/approvals should return approvals list", async () => {
    const res = await approvalsGet();
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("approvals");
    expect(Array.isArray(data.approvals)).toBe(true);
    expect(data.approvals[0]).toHaveProperty("sessionId");
    expect(data.approvals[0]).toHaveProperty("assignmentId");
    expect(data.approvals[0]).toHaveProperty("requestedBy");
    expect(data.approvals[0]).toHaveProperty("actionType");
  });

  it("POST /api/approvals should create new approval", async () => {
    const res = await approvalsPost(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "destructive-action",
          sessionId: "cursor-opencode-main-session",
          assignmentId: "assignment-bootstrap-plan",
          requester: "test-agent",
          requestedBy: "test-agent",
          actionType: "deploy",
          target: "test deploy",
          context: { message: "test" },
        }),
      }),
    );

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approval.status).toBe("pending");
    expect(data.approval.assignmentId).toBe("assignment-bootstrap-plan");
  });
});

describe("Integration: Collaboration execution", () => {
  it("should create and run a cursor assignment end-to-end", async () => {
    const sessionsRes = await collaborationSessionsGet(
      new Request("http://localhost/api/collaboration/sessions"),
    );
    const sessionsData = await sessionsRes.json();
    const sessionId = sessionsData.sessions[0].id;

    const executeRes = await collaborationExecutePost(
      new Request("http://localhost/api/collaboration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tool: "cursor",
          taskTitle: "Plan next patch",
          taskPrompt: "Plan next patch",
          targetFiles: ["docs/reports/cursor-opencode-collaboration.md"],
        }),
      }),
    );

    expect(executeRes.ok).toBe(true);
    const executeData = await executeRes.json();
    expect(executeData.success).toBe(true);
    expect(executeData.assignment.status).toBe("done");
    expect(executeData.sessionStatus).toBe("in-progress");

    const refreshed = await collaborationSessionsGet(
      new Request("http://localhost/api/collaboration/sessions"),
    );
    const refreshedData = await refreshed.json();
    const session = refreshedData.sessions.find(
      (item: { id: string }) => item.id === sessionId,
    );
    expect(
      session.handoffs.some(
        (handoff: { from: string; to: string }) =>
          handoff.from === "cursor" && handoff.to === "opencode",
      ),
    ).toBe(true);
    expect(
      session.assignments.some(
        (assignment: { metadata?: Record<string, unknown> }) =>
          assignment.metadata?.trigger === "cursor-handoff",
      ),
    ).toBe(true);
  });

  it("should wait for approval and resume assignment after approval", async () => {
    const sessionsRes = await collaborationSessionsGet(
      new Request("http://localhost/api/collaboration/sessions"),
    );
    const sessionsData = await sessionsRes.json();
    const sessionId = sessionsData.sessions[0].id;

    const pendingRes = await collaborationExecutePost(
      new Request("http://localhost/api/collaboration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tool: "opencode",
          taskTitle: "Deploy protected patch",
          taskPrompt: "Deploy protected patch",
          targetFiles: ["apps/api/src/index.ts"],
          requiredApprovals: ["deploy"],
        }),
      }),
    );

    expect(pendingRes.ok).toBe(true);
    const pendingData = await pendingRes.json();
    expect(pendingData.success).toBe(false);
    expect(pendingData.assignment.status).toBe("waiting-for-approval");
    expect(pendingData.approvalStatus).toBe("pending");

    const approvalId = pendingData.approvals[0].id as string;
    await approvalsPost(
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

    const resumeRes = await collaborationResumePost(
      new Request(
        `http://localhost/api/collaboration/assignments/${pendingData.assignment.id}/resume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            tool: "opencode",
            taskTitle: "Resume protected deploy",
            taskPrompt: "Resume protected deploy",
          }),
        },
      ),
      { params: Promise.resolve({ assignmentId: pendingData.assignment.id }) },
    );

    expect(resumeRes.ok).toBe(true);
    const resumeData = await resumeRes.json();
    expect(resumeData.success).toBe(true);
    expect(resumeData.assignment.status).toBe("done");
  });

  it("should block assignment resume after rejection", async () => {
    const sessionsRes = await collaborationSessionsGet(
      new Request("http://localhost/api/collaboration/sessions"),
    );
    const sessionsData = await sessionsRes.json();
    const sessionId = sessionsData.sessions[0].id;

    const pendingRes = await collaborationExecutePost(
      new Request("http://localhost/api/collaboration/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tool: "opencode",
          taskTitle: "Deploy rejected patch",
          taskPrompt: "Deploy rejected patch",
          targetFiles: ["apps/web/src/app/api/integrations/health/route.ts"],
          requiredApprovals: ["deploy"],
        }),
      }),
    );

    expect(pendingRes.ok).toBe(true);
    const pendingData = await pendingRes.json();
    const approvalId = pendingData.approvals[0].id as string;

    const rejectRes = await approvalsPost(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "rejected",
          resolvedBy: "qa-user",
          resolution: "rejected in integration test",
        }),
      }),
    );
    expect(rejectRes.ok).toBe(true);

    const resumeRes = await collaborationResumePost(
      new Request(
        `http://localhost/api/collaboration/assignments/${pendingData.assignment.id}/resume`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            tool: "opencode",
            taskTitle: "Resume rejected deploy",
            taskPrompt: "Resume rejected deploy",
          }),
        },
      ),
      { params: Promise.resolve({ assignmentId: pendingData.assignment.id }) },
    );

    expect(resumeRes.status).toBe(403);
    const resumeData = await resumeRes.json();
    expect(resumeData.approvalStatus).toBe("rejected");
  });
});

describe("Integration: F-aios-v3 Health", () => {
  it("API server /health should be healthy", async () => {
    const res = await fetch(`${apiBaseUrl}/health`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("F-aios-v3 proxy health should work", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "ok",
          version: "0.1.0",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const res = await aiosV3HealthGet();
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("ok");
    fetchSpy.mockRestore();
  });
});

describe("Integration: Multi-project integrations health", () => {
  it("GET /api/integrations/health should return project registry report", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = String(input);
        if (
          url.includes("/health") ||
          url.includes("/api/system/health") ||
          url.includes("/api/health")
        ) {
          return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ status: "unreachable" }), {
          status: 503,
        });
      });

    const res = await integrationsHealthGet();
    expect([200, 503]).toContain(res.status);
    const data = await res.json();
    expect(["ok", "degraded"]).toContain(data.status);
    expect(data.projects).toHaveLength(5);
    expect(data.summary.total).toBe(5);
    expect(data.summary.ok + data.summary.planned + data.summary.degraded).toBeGreaterThan(0);
    expect(
      data.projects.some((project: { id: string }) => project.id === "aios-v1"),
    ).toBe(true);
    fetchSpy.mockRestore();
  });
});

describe("Integration: Unified Ops Console", () => {
  it("GET /api/ops/summary should aggregate health, approvals, sessions, evidence, and dispatch state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = await opsSummaryGet();
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toHaveProperty("health");
    expect(Array.isArray(data.approvals)).toBe(true);
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(Array.isArray(data.evidence)).toBe(true);
    expect(data.dispatch.cursorAgentAvailable).toBe(true);
    expect(data.dispatch.opencodeAvailable).toBe(true);
    fetchSpy.mockRestore();
  });

  it("POST /api/ops/dispatch should execute safe verify tasks without approval", async () => {
    const res = await opsDispatchPost(
      new Request("http://localhost/api/ops/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "cursor-agent",
          mode: "verify",
          prompt: "Respond with exactly: OK",
          targetFiles: ["docs/reports/phase-1-unified-ops-console-plan.md"],
        }),
      }),
    );

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("not-required");
    expect(data.assignment.status).toBe("done");
  });

  it("POST /api/ops/dispatch should create approval for risky implement actions", async () => {
    const res = await opsDispatchPost(
      new Request("http://localhost/api/ops/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "opencode",
          mode: "implement",
          prompt: "Prepare deploy command",
          targetFiles: ["apps/web/src/app/api/ops/dispatch/route.ts"],
          approvalAction: "deploy",
        }),
      }),
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval.actionType).toBe("deploy");
    expect(data.assignment.status).toBe("waiting-for-approval");
  });
});

describe("Integration: Phase 4 gated proxy routes", () => {
  it("POST /api/sangfor/workflows/[id]/execute should return 409 without approval", async () => {
    const res = await sangforExecutePost(
      new Request("http://localhost/api/sangfor/workflows/wf-1/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedBy: "test-user" }),
      }),
      { params: Promise.resolve({ id: "wf-1" }) },
    );

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval.actionType).toBe("deploy");
  });

  it("POST /api/vibe-coding/rag/ingest should resume after approval", async () => {
    const pendingRes = await vibeIngestPost(
      new Request("http://localhost/api/vibe-coding/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "docs",
          requestedBy: "test-user",
          sourceType: "text",
          projectId: "demo",
        }),
      }),
    );

    expect(pendingRes.status).toBe(409);
    const pendingData = await pendingRes.json();
    const approvalId = pendingData.approval.id as string;

    await approvalsPost(
      new Request("http://localhost/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          status: "approved",
          resolvedBy: "qa-user",
          resolution: "approved in integration test",
        }),
      }),
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          ingested: 1,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const approvedRes = await vibeIngestPost(
      new Request("http://localhost/api/vibe-coding/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "docs",
          requestedBy: "test-user",
          approvalId,
          sourceType: "text",
          projectId: "demo",
          content: "hello",
        }),
      }),
    );

    expect(approvedRes.ok).toBe(true);
    const approvedData = await approvedRes.json();
    expect(approvedData.success).toBe(true);
    expect(approvedData.approvalStatus).toBe("approved");
    fetchSpy.mockRestore();
  });
});

describe("Integration: Collaboration UI route smoke", () => {
  it("should export collaboration page component", () => {
    expect(typeof collaborationPageModule.default).toBe("function");
  });
});
