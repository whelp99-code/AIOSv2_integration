"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

interface VibeSummaryItem {
  id?: string;
  name?: string;
  title?: string;
  status?: string;
  description?: string;
  type?: string;
  cron?: string;
  nextRun?: string;
}

interface PendingApproval {
  id: string;
  actionType?: string;
  target?: string;
  status?: string;
  requestedBy?: string;
  assignmentId?: string;
}

type FetchState = "loading" | "ok" | "error";

type IngestStatus =
  | { kind: "idle" }
  | { kind: "success"; message: string }
  | { kind: "failure"; message: string }
  | { kind: "pending"; message: string }
  | { kind: "rejected"; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractList(data: unknown, primaryKey: string): VibeSummaryItem[] {
  if (Array.isArray(data)) {
    return data.filter(isRecord) as VibeSummaryItem[];
  }

  if (!isRecord(data)) {
    return [];
  }

  const keys = [primaryKey, "items", "data"] as const;
  for (const key of keys) {
    const candidate = data[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord) as VibeSummaryItem[];
    }
  }

  return [];
}

function parseApproval(value: unknown): PendingApproval | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return {
    id: value.id,
    actionType:
      typeof value.actionType === "string" ? value.actionType : undefined,
    target: typeof value.target === "string" ? value.target : undefined,
    status: typeof value.status === "string" ? value.status : undefined,
    requestedBy:
      typeof value.requestedBy === "string" ? value.requestedBy : undefined,
    assignmentId:
      typeof value.assignmentId === "string" ? value.assignmentId : undefined,
  };
}

function parseApprovalFromResponse(data: unknown): PendingApproval | null {
  if (!isRecord(data)) {
    return null;
  }
  return parseApproval(data.approval);
}

function itemLabel(item: VibeSummaryItem): string {
  return item.name ?? item.title ?? item.id ?? "—";
}

const cardClass = "rounded-xl border border-gray-200 bg-white p-6 shadow-sm";
const sectionTitleClass = "mb-4 text-lg font-semibold text-gray-900";

export default function VibeCodingPage() {
  const [projects, setProjects] = useState<VibeSummaryItem[]>([]);
  const [agents, setAgents] = useState<VibeSummaryItem[]>([]);
  const [schedules, setSchedules] = useState<VibeSummaryItem[]>([]);
  const [projectsState, setProjectsState] = useState<FetchState>("loading");
  const [agentsState, setAgentsState] = useState<FetchState>("loading");
  const [schedulesState, setSchedulesState] = useState<FetchState>("loading");
  const [upstreamConnected, setUpstreamConnected] = useState(false);

  const [ragTitle, setRagTitle] = useState("");
  const [ragSourceType, setRagSourceType] = useState("markdown");
  const [ragProjectId, setRagProjectId] = useState("");
  const [ragContent, setRagContent] = useState("");
  const [pendingApproval, setPendingApproval] =
    useState<PendingApproval | null>(null);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>({
    kind: "idle",
  });
  const [ingestBusy, setIngestBusy] = useState(false);

  const loadSummaries = useCallback(async () => {
    setProjectsState("loading");
    setAgentsState("loading");
    setSchedulesState("loading");

    const [projectsRes, agentsRes, schedulesRes] = await Promise.all([
      fetch("/api/vibe-coding/projects", { cache: "no-store" }),
      fetch("/api/vibe-coding/agents", { cache: "no-store" }),
      fetch("/api/vibe-coding/learning/schedules", { cache: "no-store" }),
    ]);

    let anyOk = false;

    if (projectsRes.ok) {
      anyOk = true;
      const data: unknown = await projectsRes.json();
      setProjects(extractList(data, "projects"));
      setProjectsState("ok");
    } else {
      setProjects([]);
      setProjectsState("error");
    }

    if (agentsRes.ok) {
      anyOk = true;
      const data: unknown = await agentsRes.json();
      setAgents(extractList(data, "agents"));
      setAgentsState("ok");
    } else {
      setAgents([]);
      setAgentsState("error");
    }

    if (schedulesRes.ok) {
      anyOk = true;
      const data: unknown = await schedulesRes.json();
      setSchedules(extractList(data, "schedules"));
      setSchedulesState("ok");
    } else {
      setSchedules([]);
      setSchedulesState("error");
    }

    setUpstreamConnected(anyOk);
  }, []);

  useEffect(() => {
    void loadSummaries();
  }, [loadSummaries]);

  async function runRagIngest(approvalId?: string) {
    try {
      const res = await fetch("/api/vibe-coding/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: ragTitle.trim() || "rag-ingest",
          sourceType: ragSourceType.trim() || "markdown",
          projectId: ragProjectId.trim(),
          content: ragContent,
          requestedBy: "portal-user",
          ...(approvalId ? { approvalId } : {}),
        }),
      });

      const data: unknown = await res.json();

      if (res.status === 409) {
        const approval = parseApprovalFromResponse(data);
        if (approval) {
          setPendingApproval(approval);
          setIngestStatus({
            kind: "pending",
            message: "RAG ingest requires approval before external sharing.",
          });
          return;
        }
      }

      if (
        res.status === 403 &&
        isRecord(data) &&
        data.approvalStatus === "rejected"
      ) {
        setPendingApproval(null);
        setIngestStatus({
          kind: "rejected",
          message:
            typeof data.error === "string"
              ? data.error
              : "Approval was rejected.",
        });
        return;
      }

      if (res.ok && isRecord(data) && data.success === true) {
        setPendingApproval(null);
        setIngestStatus({
          kind: "success",
          message: "RAG ingest completed successfully.",
        });
        setRagContent("");
        return;
      }

      const errorMessage =
        isRecord(data) && typeof data.error === "string"
          ? data.error
          : "Upstream unavailable or ingest failed.";
      setIngestStatus({ kind: "failure", message: errorMessage });
    } catch {
      setIngestStatus({
        kind: "failure",
        message: "Could not reach the RAG ingest API.",
      });
    }
  }

  async function submitRagIngest(approvalId?: string) {
    setIngestBusy(true);
    try {
      await runRagIngest(approvalId);
    } finally {
      setIngestBusy(false);
    }
  }

  async function handleIngestSubmit(event: FormEvent) {
    event.preventDefault();
    if (pendingApproval && ingestStatus.kind === "pending") {
      setIngestStatus({
        kind: "pending",
        message: "Resolve the pending approval before submitting again.",
      });
      return;
    }
    if (!ragContent.trim()) {
      setIngestStatus({
        kind: "failure",
        message: "Content is required for RAG ingest.",
      });
      return;
    }
    setPendingApproval(null);
    setIngestStatus({ kind: "idle" });
    await submitRagIngest();
  }

  async function handleApprove() {
    if (!pendingApproval) return;
    setIngestBusy(true);
    try {
      const approveRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          status: "approved",
          resolvedBy: "portal-user",
          resolution: "approved via vibe-coding page",
        }),
      });

      if (!approveRes.ok) {
        setIngestStatus({
          kind: "failure",
          message: "Failed to record approval.",
        });
        return;
      }

      await runRagIngest(pendingApproval.id);
    } finally {
      setIngestBusy(false);
    }
  }

  async function handleReject() {
    if (!pendingApproval) return;
    setIngestBusy(true);
    try {
      const rejectRes = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: pendingApproval.id,
          status: "rejected",
          resolvedBy: "portal-user",
          resolution: "rejected via vibe-coding page",
        }),
      });

      if (!rejectRes.ok) {
        setIngestStatus({
          kind: "failure",
          message: "Failed to record rejection.",
        });
        return;
      }

      setPendingApproval(null);
      setIngestStatus({
        kind: "rejected",
        message: "RAG ingest was rejected. No upstream call was made.",
      });
    } finally {
      setIngestBusy(false);
    }
  }

  function renderFetchHint(state: FetchState): string | null {
    if (state === "loading") return "Loading…";
    if (state === "error") return "Upstream unavailable or request failed.";
    return null;
  }

  function renderStatusBanner() {
    if (ingestStatus.kind === "idle") return null;

    const statusClasses: Record<
      Exclude<IngestStatus["kind"], "idle">,
      string
    > = {
      success: "border border-emerald-300 bg-emerald-100 text-emerald-800",
      failure: "border border-red-300 bg-red-100 text-red-800",
      pending: "border border-amber-300 bg-amber-100 text-amber-800",
      rejected: "border border-red-300 bg-red-100 text-red-800",
    };

    return (
      <div className={`mb-4 rounded-lg px-4 py-3 text-sm ${statusClasses[ingestStatus.kind]}`}>
        {ingestStatus.message}
      </div>
    );
  }

  function renderSummaryList(items: VibeSummaryItem[], emptyLabel: string) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      );
    }

    return (
      <div className="flex flex-col gap-2.5">
        {items.map((item, index) => (
          <div
            key={item.id ?? `${itemLabel(item)}-${index}`}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3"
          >
            <p className="mb-1 text-sm font-semibold text-gray-900">
              {itemLabel(item)}
            </p>
            <p className="text-xs text-gray-500">
              {[
                item.status,
                item.type,
                item.description,
                item.cron,
                item.nextRun,
              ]
                .filter(Boolean)
                .join(" · ") || "No details"}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 p-8">
      <div className="mb-7">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Vibe Coding
        </h1>
        <p className="text-sm text-gray-500">
          Projects, agents, learning schedules, and RAG ingest{" "}
          {upstreamConnected ? "(connected)" : "(upstream unavailable)"}
        </p>
      </div>

      <div className="mb-7 grid grid-cols-3 gap-4">
        <div className={cardClass}>
          <h2 className={sectionTitleClass}>Projects</h2>
          {renderFetchHint(projectsState) && (
            <p className="mb-3 text-xs text-gray-500">
              {renderFetchHint(projectsState)}
            </p>
          )}
          {renderSummaryList(projects, "No projects returned.")}
        </div>

        <div className={cardClass}>
          <h2 className={sectionTitleClass}>Agents</h2>
          {renderFetchHint(agentsState) && (
            <p className="mb-3 text-xs text-gray-500">
              {renderFetchHint(agentsState)}
            </p>
          )}
          {renderSummaryList(agents, "No agents returned.")}
        </div>

        <div className={cardClass}>
          <h2 className={sectionTitleClass}>Learning Schedules</h2>
          {renderFetchHint(schedulesState) && (
            <p className="mb-3 text-xs text-gray-500">
              {renderFetchHint(schedulesState)}
            </p>
          )}
          {renderSummaryList(schedules, "No schedules returned.")}
        </div>
      </div>

      <div className={cardClass}>
        <h2 className={sectionTitleClass}>RAG Ingest</h2>
        <p className="mb-5 text-sm text-gray-500">
          External sharing requires manual approval. Submit first to create a
          pending approval, then approve or reject before retry.
        </p>

        {renderStatusBanner()}

        {pendingApproval && ingestStatus.kind === "pending" && (
          <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="mb-2 text-sm font-semibold text-amber-800">
              Pending approval
            </p>
            <div className="mb-3 text-xs text-amber-900">
              <div>ID: {pendingApproval.id}</div>
              {pendingApproval.actionType && (
                <div>Action: {pendingApproval.actionType}</div>
              )}
              {pendingApproval.target && (
                <div>Target: {pendingApproval.target}</div>
              )}
              {pendingApproval.requestedBy && (
                <div>Requested by: {pendingApproval.requestedBy}</div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={ingestBusy}
                className={`rounded-lg bg-emerald-600 px-4 py-2 text-xs text-white ${
                  ingestBusy ? "cursor-wait" : "cursor-pointer"
                }`}
              >
                Approve &amp; ingest
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={ingestBusy}
                className={`rounded-lg border border-red-300 bg-white px-4 py-2 text-xs text-red-600 ${
                  ingestBusy ? "cursor-wait" : "cursor-pointer"
                }`}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(event) => void handleIngestSubmit(event)}>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-700">Title</span>
              <input
                type="text"
                value={ragTitle}
                onChange={(event) => setRagTitle(event.target.value)}
                placeholder="Document title"
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-gray-700">Source type</span>
              <select
                value={ragSourceType}
                onChange={(event) => setRagSourceType(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="markdown">markdown</option>
                <option value="text">text</option>
                <option value="code">code</option>
                <option value="document">document</option>
              </select>
            </label>
          </div>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-700">Project ID</span>
            <input
              type="text"
              value={ragProjectId}
              onChange={(event) => setRagProjectId(event.target.value)}
              placeholder="project-id"
              list="vibe-project-ids"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
            <datalist id="vibe-project-ids">
              {projects.map((project) =>
                project.id ? (
                  <option key={project.id} value={project.id} />
                ) : null,
              )}
            </datalist>
          </label>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-xs font-medium text-gray-700">Content</span>
            <textarea
              value={ragContent}
              onChange={(event) => setRagContent(event.target.value)}
              rows={8}
              placeholder="Paste content to ingest into RAG"
              className="resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={
                ingestBusy ||
                (pendingApproval !== null && ingestStatus.kind === "pending")
              }
              className={`rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white ${
                ingestBusy ? "cursor-wait" : "cursor-pointer"
              }`}
            >
              {ingestBusy ? "Submitting…" : "Submit ingest"}
            </button>
            <button
              type="button"
              onClick={() => void loadSummaries()}
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm text-gray-700"
            >
              Refresh summaries
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
