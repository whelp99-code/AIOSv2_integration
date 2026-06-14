import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

let tempRoot: string;

let captureMenuGet: typeof import("../../apps/web/src/app/api/sangfor/device/capture-menu/route").GET;
let compareGet: typeof import("../../apps/web/src/app/api/sangfor/device/compare/route").GET;
let trackPost: typeof import("../../apps/web/src/app/api/sangfor/compliance/track/route").POST;
let roadmapPost: typeof import("../../apps/web/src/app/api/sangfor/compliance/roadmap/route").POST;
let proposalPost: typeof import("../../apps/web/src/app/api/sangfor/compliance/proposal/route").POST;
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
              id: "sangfor-compliance-track",
              title: "compliance track",
              description: "compliance track assignment",
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
              id: "sangfor-compliance-roadmap",
              title: "compliance roadmap",
              description: "compliance roadmap assignment",
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
              id: "sangfor-compliance-proposal",
              title: "compliance proposal",
              description: "compliance proposal assignment",
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
}

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "sangfor-phase4-"));
  await setupApprovalState();
  vi.resetModules();

  const [
    captureMenuRoute,
    compareRoute,
    trackRoute,
    roadmapRoute,
    proposalRoute,
    approvalsRoute,
  ] = await Promise.all([
    import("../../apps/web/src/app/api/sangfor/device/capture-menu/route"),
    import("../../apps/web/src/app/api/sangfor/device/compare/route"),
    import("../../apps/web/src/app/api/sangfor/compliance/track/route"),
    import("../../apps/web/src/app/api/sangfor/compliance/roadmap/route"),
    import("../../apps/web/src/app/api/sangfor/compliance/proposal/route"),
    import("../../apps/web/src/app/api/approvals/route"),
  ]);

  captureMenuGet = captureMenuRoute.GET;
  compareGet = compareRoute.GET;
  trackPost = trackRoute.POST;
  roadmapPost = roadmapRoute.POST;
  proposalPost = proposalRoute.POST;
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

describe("Phase 4: Sangfor device read proxy", () => {
  it("GET /api/sangfor/device/capture-menu proxies with query passthrough", async () => {
    const mockData = { menus: [{ id: "m1", label: "Capture" }] };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockData));

    const res = await captureMenuGet(
      new Request(
        "http://localhost/api/sangfor/device/capture-menu?interface=eth0&mode=full",
      ),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data).toEqual(mockData);

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/device/capture-menu");
    expect(calledUrl).toContain("interface=eth0");
    expect(calledUrl).toContain("mode=full");
    fetchSpy.mockRestore();
  });

  it("GET /api/sangfor/device/compare returns 500 on upstream thrown error", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const res = await compareGet(
      new Request("http://localhost/api/sangfor/device/compare?left=a&right=b"),
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Sangfor device compare proxy error");
    expect(data.details).toContain("ECONNREFUSED");
    fetchSpy.mockRestore();
  });
});

describe("Phase 4: Sangfor compliance POST approval gate", () => {
  it("POST /api/sangfor/compliance/track without approval returns 409", async () => {
    const res = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New tracking rule" }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval).toBeDefined();
    expect(data.approval.assignmentId).toBe("sangfor-compliance-track");
  });

  it("POST /api/sangfor/compliance/roadmap without approval returns 409", async () => {
    const res = await roadmapPost(
      new Request("http://localhost/api/sangfor/compliance/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [] }),
      }),
    );
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.approvalStatus).toBe("pending");
    expect(data.approval.assignmentId).toBe("sangfor-compliance-roadmap");
  });

  it("POST /api/sangfor/compliance/track with rejected approval returns 403", async () => {
    const pendingRes = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Rule" }),
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

    const res = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, title: "Rule" }),
      }),
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.approvalStatus).toBe("rejected");
  });

  it("POST /api/sangfor/compliance/proposal with approved approval forwards upstream and strips approvalId", async () => {
    const pendingRes = await proposalPost(
      new Request("http://localhost/api/sangfor/compliance/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Proposal A" }),
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

    const mockUpstreamResult = { accepted: true, proposalId: "p-1" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockUpstreamResult));

    const res = await proposalPost(
      new Request("http://localhost/api/sangfor/compliance/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          requestedBy: "test-user",
          title: "Proposal A",
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
    expect(upstreamBody.title).toBe("Proposal A");
    fetchSpy.mockRestore();
  });
});

describe("Phase 4: Approval gate - cross-assignment/actionType reuse rejection", () => {
  it("approved approval for track cannot be reused for roadmap (different assignmentId)", async () => {
    const pendingRes = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Track rule" }),
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

    const res = await roadmapPost(
      new Request("http://localhost/api/sangfor/compliance/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, items: [] }),
      }),
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("assignment");
  });

  it("approved approval for proposal cannot be reused for track (different assignmentId)", async () => {
    const pendingRes = await proposalPost(
      new Request("http://localhost/api/sangfor/compliance/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Proposal B" }),
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

    const res = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, title: "Track rule" }),
      }),
    );
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain("assignment");
  });

  it("approved approval for one assignment still works for the same assignment", async () => {
    const pendingRes = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Same assignment test" }),
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

    const mockUpstreamResult = { accepted: true };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(mockUpstreamResult));

    const res = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, title: "Same assignment test" }),
      }),
    );
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);
    fetchSpy.mockRestore();
  });

  it("approved approval for one actionType cannot be reused for another actionType", async () => {
    const pendingRes = await trackPost(
      new Request("http://localhost/api/sangfor/compliance/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Action type test" }),
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

    const { ensureApprovedAction } =
      await import("../../apps/web/src/lib/integrations/approval-gate");
    const gate = await ensureApprovedAction({
      approvalId,
      assignmentId: "sangfor-compliance-track",
      requestedBy: "qa-user",
      actionType: "deploy",
      target: "sangfor compliance track as deploy",
    });
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) {
      expect(gate.response.status).toBe(403);
      const data = await gate.response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("actionType");
    }
  });
});
