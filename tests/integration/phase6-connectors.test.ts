import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempRoot: string;

let slackSendPost: typeof import("../../apps/web/src/app/api/slack/send/route").POST;
let whelp99HealthGet: typeof import("../../apps/web/src/app/api/whelp99/health/route").GET;
let whelp99ToolsGet: typeof import("../../apps/web/src/app/api/whelp99/tools/route").GET;
let whelp99ToolCallPost: typeof import("../../apps/web/src/app/api/whelp99/tools/call/route").POST;
let githubBranchesPost: typeof import("../../apps/web/src/app/api/github/branches/route").POST;
let githubPrPost: typeof import("../../apps/web/src/app/api/github/pull-requests/route").POST;
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
              id: "slack-send-message",
              title: "slack send",
              description: "slack send assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["send"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
            {
              id: "whelp99-tool-call",
              title: "whelp99 tool call",
              description: "whelp99 tool call assignment",
              assignedTo: "opencode",
              role: "implementer",
              targetFiles: [],
              requiredApprovals: ["device-control"],
              status: "queued",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              metadata: {},
            },
            {
              id: "github-create-branch",
              title: "github branch",
              description: "github branch assignment",
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
              id: "github-create-pr",
              title: "github PR",
              description: "github PR assignment",
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
          metadata: { phase: 6 },
        },
      ],
    }),
    "utf8",
  );
}

async function approveApproval(approvalId: string) {
  const res = await approvalsPost(
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
  expect(res.ok).toBe(true);
}

async function countRecordedArtifacts() {
  const statePath = process.env.AIOS_COLLABORATION_STATE_PATH;
  expect(statePath).toBeDefined();
  const state = JSON.parse(await readFile(statePath!, "utf8")) as {
    sessions?: Array<{ artifacts?: unknown[] }>;
  };
  return state.sessions?.[0]?.artifacts?.length ?? 0;
}

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "phase6-"));
  await setupApprovalState();
  vi.resetModules();

  delete process.env.SLACK_WEBHOOK_URL;
  delete process.env.WHELP99_MCP_HTTP_URL;
  delete process.env.WHELP99_MCP_PATH;
  delete process.env.GITHUB_TOKEN;

  const [
    slackRoute,
    whelp99HealthRoute,
    whelp99ToolsRoute,
    whelp99CallRoute,
    branchesRoute,
    prRoute,
    approvalsRoute,
  ] = await Promise.all([
    import("../../apps/web/src/app/api/slack/send/route"),
    import("../../apps/web/src/app/api/whelp99/health/route"),
    import("../../apps/web/src/app/api/whelp99/tools/route"),
    import("../../apps/web/src/app/api/whelp99/tools/call/route"),
    import("../../apps/web/src/app/api/github/branches/route"),
    import("../../apps/web/src/app/api/github/pull-requests/route"),
    import("../../apps/web/src/app/api/approvals/route"),
  ]);

  slackSendPost = slackRoute.POST;
  whelp99HealthGet = whelp99HealthRoute.GET;
  whelp99ToolsGet = whelp99ToolsRoute.GET;
  whelp99ToolCallPost = whelp99CallRoute.POST;
  githubBranchesPost = branchesRoute.POST;
  githubPrPost = prRoute.POST;
  approvalsPost = approvalsRoute.POST;
});

afterEach(async () => {
  delete process.env.AIOS_APPROVAL_QUEUE_PATH;
  delete process.env.AIOS_COLLABORATION_STATE_PATH;
  delete process.env.AIOS_COLLABORATION_EVIDENCE_DIR;
  delete process.env.SLACK_WEBHOOK_URL;
  delete process.env.WHELP99_MCP_HTTP_URL;
  delete process.env.WHELP99_MCP_PATH;
  delete process.env.GITHUB_TOKEN;
  vi.resetModules();
  vi.restoreAllMocks();
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
  }
});

describe("Phase 6: WHELP99 health and tools", () => {
  it("GET /api/whelp99/health returns planned when no URL configured", async () => {
    const res = await whelp99HealthGet(
      new Request("http://localhost/api/whelp99/health"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("planned");
    expect(data.connected).toBe(false);
  });

  it("GET /api/whelp99/health returns ok when upstream responds", async () => {
    process.env.WHELP99_MCP_HTTP_URL = "http://whelp99-mcp.local";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ status: "healthy" }));

    const res = await whelp99HealthGet(
      new Request("http://localhost/api/whelp99/health"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.connected).toBe(true);
    fetchSpy.mockRestore();
  });

  it("GET /api/whelp99/tools returns empty tools when no URL configured", async () => {
    const res = await whelp99ToolsGet(
      new Request("http://localhost/api/whelp99/tools"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("planned");
    expect(data.tools).toEqual([]);
  });

  it("GET /api/whelp99/tools returns tools from upstream", async () => {
    process.env.WHELP99_MCP_HTTP_URL = "http://whelp99-mcp.local";
    const mockTools = [{ name: "restart-device" }, { name: "get-status" }];
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockTools));

    const res = await whelp99ToolsGet(
      new Request("http://localhost/api/whelp99/tools"),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.tools).toEqual(mockTools);
    fetchSpy.mockRestore();
  });
});

describe("Phase 6: WHELP99 tool call approval gate", () => {
  it("POST /api/whelp99/tools/call without approval returns 409", async () => {
    const res = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "restart-device", args: { id: "d1" } }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval).toBeDefined();
    expect(data.approval.assignmentId).toBe("whelp99-tool-call");
  });

  it("POST /api/whelp99/tools/call approved path calls configured URL and strips approvalId/requestedBy", async () => {
    process.env.WHELP99_MCP_HTTP_URL = "http://whelp99-mcp.local";

    const pendingRes = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "restart-device" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ok: true, restarted: true }));

    const res = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          name: "restart-device",
          args: { id: "d1" },
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    expect(upstreamBody.name).toBe("restart-device");
    fetchSpy.mockRestore();
  });

  it("POST /api/whelp99/tools/call no URL after approval returns 503 and no artifact", async () => {
    const pendingRes = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "restart-device" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    const res = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, name: "restart-device" }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("WHELP99_MCP_HTTP_URL");
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });

  it("POST /api/whelp99/tools/call upstream HTTP failure does not record artifact", async () => {
    process.env.WHELP99_MCP_HTTP_URL = "http://whelp99-mcp.local";

    const pendingRes = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "restart-device" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ error: "upstream failed" }, 502),
    );

    const res = await whelp99ToolCallPost(
      new Request("http://localhost/api/whelp99/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, name: "restart-device" }),
      }),
    );
    expect(res.status).toBe(502);
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });
});

describe("Phase 6: Slack send approval gate", () => {
  it("POST /api/slack/send without approval returns 409 and does not call fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POST /api/slack/send approved path calls webhook and strips approvalId", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test-webhook";

    const pendingRes = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const res = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          text: "hello",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    expect(upstreamBody.text).toBe("hello");
    fetchSpy.mockRestore();
  });

  it("POST /api/slack/send upstream failure does not record artifact", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test-webhook";

    const pendingRes = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network failure"),
    );

    const res = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, text: "hello" }),
      }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Slack send failed");
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });

  it("POST /api/slack/send upstream HTTP failure does not record artifact", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/test-webhook";

    const pendingRes = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("webhook failed", { status: 500 }),
    );

    const res = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, text: "hello" }),
      }),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Slack webhook returned an error");
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });

  it("POST /api/slack/send no webhook after approval returns 503", async () => {
    const pendingRes = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    const res = await slackSendPost(
      new Request("http://localhost/api/slack/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, text: "hello" }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("SLACK_WEBHOOK_URL");
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });
});

describe("Phase 6: GitHub branches and PRs approval gate", () => {
  it("POST /api/github/branches without approval returns 409 and does not call fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POST /api/github/branches approved path calls GitHub API with token and strips approvalId/requestedBy", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_token";

    const pendingRes = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({
        ref: "refs/heads/feature-x",
        object: { sha: "abc123" },
      }),
    );

    const res = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.github.com/repos/org/repo/git/refs");
    const authHeader = (
      fetchSpy.mock.calls[0][1]!.headers as Record<string, string>
    ).Authorization;
    expect(authHeader).toBe("Bearer ghp_test_token");

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    fetchSpy.mockRestore();
  });

  it("POST /api/github/branches missing token after approval returns 503", async () => {
    const pendingRes = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    const res = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("GITHUB_TOKEN");
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });

  it("POST /api/github/branches upstream HTTP failure does not record artifact", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_token";

    const pendingRes = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "invalid sha" }, 422),
    );

    const res = await githubBranchesPost(
      new Request("http://localhost/api/github/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          owner: "org",
          repo: "repo",
          branch: "feature-x",
          baseSha: "abc123",
        }),
      }),
    );
    expect(res.status).toBe(422);
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });

  it("POST /api/github/pull-requests without approval returns 409 and does not call fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const res = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
        }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("POST /api/github/pull-requests approved path calls GitHub API with token and strips approvalId/requestedBy", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_token";

    const pendingRes = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
        }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse({ number: 42, title: "Add feature", state: "open" }),
      );

    const res = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
          body: "PR description",
        }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.approvalStatus).toBe("approved");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.github.com/repos/org/repo/pulls");
    const authHeader = (
      fetchSpy.mock.calls[0][1]!.headers as Record<string, string>
    ).Authorization;
    expect(authHeader).toBe("Bearer ghp_test_token");

    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(upstreamBody).not.toHaveProperty("approvalId");
    expect(upstreamBody).not.toHaveProperty("requestedBy");
    expect(upstreamBody.title).toBe("Add feature");
    fetchSpy.mockRestore();
  });

  it("POST /api/github/pull-requests missing token after approval returns 503", async () => {
    const pendingRes = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
        }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    const res = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
        }),
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toContain("GITHUB_TOKEN");
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });

  it("POST /api/github/pull-requests upstream HTTP failure does not record artifact", async () => {
    process.env.GITHUB_TOKEN = "ghp_test_token";

    const pendingRes = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
        }),
      }),
    );
    expect(pendingRes.status).toBe(409);
    const pendingBody = await pendingRes.json();
    const approvalId = pendingBody.approval.id as string;

    await approveApproval(approvalId);
    const artifactsBeforeAction = await countRecordedArtifacts();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse({ message: "validation failed" }, 422),
    );

    const res = await githubPrPost(
      new Request("http://localhost/api/github/pull-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          owner: "org",
          repo: "repo",
          title: "Add feature",
          head: "feature-x",
          base: "main",
        }),
      }),
    );
    expect(res.status).toBe(422);
    expect(await countRecordedArtifacts()).toBe(artifactsBeforeAction);
  });
});
